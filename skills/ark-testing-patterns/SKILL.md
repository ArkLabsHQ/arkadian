# Ark Testing Patterns

## Overview

This skill covers testing patterns across the Ark ecosystem: E2E tests with nigiri (Bitcoin regtest), unit tests with mocks, table-driven tests, and multi-participant concurrent testing patterns.

## Key Files

| Repository | File | Purpose |
|------------|------|---------|
| arkd | `internal/test/e2e/e2e_test.go` | E2E integration tests |
| arkd | `internal/test/e2e/utils_test.go` | Test utilities (nigiri, faucet) |
| arkd | `internal/infrastructure/tx-builder/covenantless/builder_test.go` | Unit tests with fixtures |
| arkd | `internal/infrastructure/tx-builder/covenantless/mocks_test.go` | Mock implementations |
| arkd | `internal/core/application/service_test.go` | Table-driven unit tests |
| fulmine | `internal/test/e2e/main_test.go` | Fulmine E2E setup |

## E2E Test Infrastructure

### Environment Configuration

```go
// internal/test/e2e/utils_test.go:42-44
const adminUrl = "http://127.0.0.1:7071"
const serverUrl = "127.0.0.1:7070"
```

### Nigiri Integration (Bitcoin Regtest)

```go
// internal/test/e2e/utils_test.go:45-58
func generateBlocks(n int) error {
    _, err := runCommand("nigiri", "rpc", "--generate", fmt.Sprintf("%d", n))
    return err
}

func getBlockHeight() (uint32, error) {
    out, err := runCommand("nigiri", "rpc", "getblockcount")
    if err != nil {
        return 0, err
    }
    height, err := strconv.ParseUint(strings.TrimSpace(out), 10, 32)
    if err != nil {
        return 0, err
    }
    return uint32(height), nil
}
```

### Command Execution Utility

```go
// internal/test/e2e/utils_test.go:74-110
func runCommand(name string, arg ...string) (string, error) {
    errb := new(strings.Builder)
    cmd := newCommand(name, arg...)

    stdout, err := cmd.StdoutPipe()
    if err != nil {
        return "", err
    }

    stderr, err := cmd.StderrPipe()
    if err != nil {
        return "", err
    }

    if err := cmd.Start(); err != nil {
        return "", err
    }
    output := new(strings.Builder)
    errorb := new(strings.Builder)

    var wg sync.WaitGroup
    wg.Add(2)

    go func() {
        defer wg.Done()
        if _, err := io.Copy(output, stdout); err != nil {
            fmt.Fprintf(errb, "error reading stdout: %s", err)
        }
    }()

    go func() {
        defer wg.Done()
        if _, err := io.Copy(errorb, stderr); err != nil {
            fmt.Fprintf(errb, "error reading stderr: %s", err)
        }
    }()

    wg.Wait()
    // ...
}
```

### Docker Exec for Container Commands

```go
// internal/test/e2e/utils_test.go:61-72
func runDockerExec(container string, arg ...string) (string, error) {
    args := append([]string{"exec", "-t", container}, arg...)
    out, err := runCommand("docker", args...)
    if err != nil {
        return "", err
    }
    idx := strings.Index(out, "{")
    if idx == -1 {
        return out, nil
    }
    return out[idx:], nil
}
```

## SDK Test Client Setup

### Basic ArkClient Setup

```go
// internal/test/e2e/utils_test.go:260-289
func setupArkSDK(t *testing.T) arksdk.ArkClient {
    appDataStore, err := store.NewStore(store.Config{
        ConfigStoreType:  types.InMemoryStore,
        AppDataStoreType: types.KVStore,
    })
    require.NoError(t, err)

    client, err := arksdk.NewArkClient(appDataStore)
    require.NoError(t, err)

    privkey, err := btcec.NewPrivateKey()
    require.NoError(t, err)

    privkeyHex := hex.EncodeToString(privkey.Serialize())

    err = client.Init(t.Context(), arksdk.InitArgs{
        WalletType:           arksdk.SingleKeyWallet,
        ClientType:           arksdk.GrpcClient,
        ServerUrl:            serverUrl,
        Password:             password,
        Seed:                 privkeyHex,
        ExplorerPollInterval: time.Second,
    })
    require.NoError(t, err)

    err = client.Unlock(t.Context(), password)
    require.NoError(t, err)

    return client
}
```

### SDK with Transport Client

```go
// internal/test/e2e/utils_test.go:291-296
func setupArkSDKWithTransport(t *testing.T) (arksdk.ArkClient, client.TransportClient) {
    client := setupArkSDK(t)
    transportClient, err := grpcclient.NewClient(serverUrl)
    require.NoError(t, err)
    return client, transportClient
}
```

### SDK with Public Key Access

```go
// internal/test/e2e/utils_test.go:328-368
func setupArkSDKwithPublicKey(
    t *testing.T,
) (arksdk.ArkClient, wallet.WalletService, *btcec.PublicKey, client.TransportClient) {
    appDataStore, err := store.NewStore(store.Config{
        ConfigStoreType:  types.InMemoryStore,
        AppDataStoreType: types.KVStore,
    })
    require.NoError(t, err)

    client, err := arksdk.NewArkClient(appDataStore)
    require.NoError(t, err)

    walletStore, err := inmemorystore.NewWalletStore()
    require.NoError(t, err)

    wallet, err := singlekeywallet.NewBitcoinWallet(appDataStore.ConfigStore(), walletStore)
    require.NoError(t, err)

    privkey, err := btcec.NewPrivateKey()
    require.NoError(t, err)

    privkeyHex := hex.EncodeToString(privkey.Serialize())

    err = client.InitWithWallet(context.Background(), arksdk.InitWithWalletArgs{
        Wallet:     wallet,
        ClientType: arksdk.GrpcClient,
        ServerUrl:  serverUrl,
        Password:   password,
        Seed:       privkeyHex,
    })
    require.NoError(t, err)

    err = client.Unlock(context.Background(), password)
    require.NoError(t, err)

    grpcClient, err := grpcclient.NewClient(serverUrl)
    require.NoError(t, err)

    return client, wallet, privkey.PubKey(), grpcClient
}
```

## Faucet Patterns

### Combined Faucet (Offchain + Onchain for Fees)

```go
// internal/test/e2e/utils_test.go:376-385
func faucet(t *testing.T, client arksdk.ArkClient, amount float64) {
    // Faucet offchain with note
    faucetOffchain(t, client, amount)

    onchainAddr, _, _, err := client.Receive(t.Context())
    require.NoError(t, err)
    require.NotEmpty(t, onchainAddr)
    // Faucet onchain addr to cover network fees for the unroll.
    faucetOnchain(t, onchainAddr, 0.00001)
}
```

### Generate Note (Admin API)

```go
// internal/test/e2e/utils_test.go:387-412
func generateNote(t *testing.T, amount uint64) string {
    adminHttpClient := &http.Client{
        Timeout: 15 * time.Second,
    }

    reqBody := bytes.NewReader([]byte(fmt.Sprintf(`{"amount": "%d"}`, amount)))
    req, err := http.NewRequest("POST", "http://localhost:7071/v1/admin/note", reqBody)
    if err != nil {
        t.Fatalf("failed to prepare note request: %s", err)
    }
    req.Header.Set("Authorization", "Basic YWRtaW46YWRtaW4=")
    req.Header.Set("Content-Type", "application/json")

    // Make request and parse response...
    return note
}
```

## Multi-Participant Test Patterns

### Concurrent Offchain Payment (Alice → Bob)

```go
// internal/test/e2e/e2e_test.go:279-312
func TestUnilateralExit(t *testing.T) {
    t.Run("preconfirmed vtxo", func(t *testing.T) {
        // Setup Alice with offchain funds
        alice := setupArkSDK(t)
        faucetOffchain(t, alice, 0.001)

        // Setup Bob
        bob := setupArkSDK(t)
        bobOnchainAddr, bobOffchainAddr, _, err := bob.Receive(t.Context())
        require.NoError(t, err)

        // Concurrent: Bob listens for incoming funds
        wg := &sync.WaitGroup{}
        wg.Add(1)
        var incomingErr error
        go func() {
            _, incomingErr = bob.NotifyIncomingFunds(t.Context(), bobOffchainAddr)
            wg.Done()
        }()

        // Alice sends to Bob offchain
        _, err = alice.SendOffChain(t.Context(), false, []types.Receiver{{
            To:     bobOffchainAddr,
            Amount: 21000,
        }})
        require.NoError(t, err)

        wg.Wait()
        require.NoError(t, incomingErr)
        time.Sleep(time.Second)

        // Verify Bob received funds
        bobBalance, err := bob.Balance(t.Context())
        require.NoError(t, err)
        require.NotZero(t, bobBalance.OffchainBalance.Total)
    })
}
```

### Chain of Offchain Transactions

```go
// internal/test/e2e/e2e_test.go:473-499
func TestOffchainTx(t *testing.T) {
    t.Run("chain of txs", func(t *testing.T) {
        ctx := context.Background()
        alice := setupArkSDK(t)
        defer alice.Stop()

        bob := setupArkSDK(t)
        defer bob.Stop()

        faucetOffchain(t, alice, 0.001)

        _, bobAddress, _, err := bob.Receive(ctx)
        require.NoError(t, err)

        wg := &sync.WaitGroup{}
        wg.Add(1)
        var incomingFunds []types.Vtxo
        var incomingErr error
        go func() {
            incomingFunds, incomingErr = bob.NotifyIncomingFunds(ctx, bobAddress)
            wg.Done()
        }()

        _, err = alice.SendOffChain(ctx, false, []types.Receiver{{
            To:     bobAddress,
            Amount: 1000,
        }})
        require.NoError(t, err)

        wg.Wait()
        // Continue with more sends to create chain...
    })
}
```

## Balance Assertion Patterns

### Offchain Balance Verification

```go
// internal/test/e2e/e2e_test.go:204-210
balance, err := alice.Balance(t.Context())
require.NoError(t, err)
require.NotNil(t, balance)
require.Zero(t, balance.OffchainBalance.Total)
require.Empty(t, balance.OnchainBalance.LockedAmount)
require.Zero(t, int(balance.OnchainBalance.SpendableAmount))
```

### Post-Payment Balance Check

```go
// internal/test/e2e/e2e_test.go:386-398
prevTotalBalance := int(aliceBalance.OffchainBalance.Total)
aliceBalance, err = alice.Balance(t.Context())
require.NoError(t, err)
require.NotNil(t, aliceBalance)
require.Greater(t, int(aliceBalance.OffchainBalance.Total), 0)
require.Less(t, int(aliceBalance.OffchainBalance.Total), prevTotalBalance)

bobBalance, err = bob.Balance(t.Context())
require.NoError(t, err)
require.NotNil(t, bobBalance)
require.Zero(t, int(bobBalance.OffchainBalance.Total))
require.Empty(t, bobBalance.OnchainBalance.LockedAmount)
require.Equal(t, 21000, int(bobBalance.OnchainBalance.SpendableAmount))
```

### Locked Amount After Unroll

```go
// internal/test/e2e/e2e_test.go:271-277
balance, err = alice.Balance(t.Context())
require.NoError(t, err)
require.NotNil(t, balance)
require.Zero(t, balance.OffchainBalance.Total)
require.NotEmpty(t, balance.OnchainBalance.LockedAmount)
require.NotZero(t, balance.OnchainBalance.LockedAmount[0].Amount)
```

## Unit Test Patterns

### Table-Driven Tests

```go
// internal/core/application/service_test.go:10-61
func TestNextScheduledSession(t *testing.T) {
    scheduledSessionStartTime := parseTime(t, "2023-10-10 13:00:00")
    scheduledSessionEndTime := parseTime(t, "2023-10-10 14:00:00")
    period := 1 * time.Hour

    testCases := []struct {
        now           time.Time
        expectedStart time.Time
        expectedEnd   time.Time
        description   string
    }{
        {
            now:           parseTime(t, "2023-10-10 13:00:00"),
            expectedStart: parseTime(t, "2023-10-10 13:00:00"),
            expectedEnd:   parseTime(t, "2023-10-10 14:00:00"),
            description:   "now is exactly scheduled session start time",
        },
        // ... more test cases
    }

    for _, tc := range testCases {
        t.Run(tc.description, func(t *testing.T) {
            startTime, endTime := calcNextScheduledSession(
                tc.now, scheduledSessionStartTime, scheduledSessionEndTime, period,
            )
            require.True(t, startTime.Equal(tc.expectedStart))
            require.True(t, endTime.Equal(tc.expectedEnd))
        })
    }
}
```

### TestMain Setup with Mocks

```go
// internal/infrastructure/tx-builder/covenantless/builder_test.go:38-57
func TestMain(m *testing.M) {
    wallet = &mockedWallet{}
    wallet.On("EstimateFees", mock.Anything, mock.Anything).
        Return(uint64(100), nil)
    wallet.On("SelectUtxos", mock.Anything, mock.Anything, mock.Anything, mock.Anything).
        Return(randomInput, uint64(1000), nil)
    wallet.On("DeriveAddresses", mock.Anything, mock.Anything).
        Return([]string{changeAddress}, nil)
    wallet.On("DeriveConnectorAddress", mock.Anything).
        Return(connectorAddress, nil)
    wallet.On("GetDustAmount", mock.Anything).
        Return(uint64(1000), nil)
    wallet.On("GetForfeitPubkey", mock.Anything).
        Return(forfeitPubkey, nil)

    pubkeyBytes, _ := hex.DecodeString(testingKey)
    pubkey, _ = btcec.ParsePubKey(pubkeyBytes)

    os.Exit(m.Run())
}
```

## Mock Implementation Pattern

```go
// internal/infrastructure/tx-builder/covenantless/mocks_test.go:15-72
type mockedWallet struct {
    mock.Mock
}

func (m *mockedWallet) GetReadyUpdate(ctx context.Context) (<-chan struct{}, error) {
    args := m.Called(ctx)
    var res chan struct{}
    if a := args.Get(0); a != nil {
        res = a.(chan struct{})
    }
    return res, args.Error(1)
}

func (m *mockedWallet) Unlock(ctx context.Context, password string) error {
    args := m.Called(ctx, password)
    return args.Error(0)
}

func (m *mockedWallet) BroadcastTransaction(ctx context.Context, txs ...string) (string, error) {
    args := m.Called(ctx, txs)
    var res string
    if a := args.Get(0); a != nil {
        res = a.(string)
    }
    return res, args.Error(1)
}

func (m *mockedWallet) SelectUtxos(
    ctx context.Context, asset string, amount uint64, confirmedOnly bool,
) ([]ports.TxInput, uint64, error) {
    args := m.Called(ctx, asset, amount, confirmedOnly)
    var res0 func() []ports.TxInput
    if a := args.Get(0); a != nil {
        res0 = a.(func() []ports.TxInput)
    }
    var res1 uint64
    if a := args.Get(1); a != nil {
        res1 = a.(uint64)
    }
    return res0(), res1, args.Error(2)
}
```

## Fixture-Based Testing

```go
// internal/infrastructure/tx-builder/covenantless/builder_test.go:59-123
func TestBuildCommitmentTx(t *testing.T) {
    builder := txbuilder.NewTxBuilder(
        wallet, nil, arklib.Bitcoin, vtxoTreeExpiry, boardingExitDelay,
    )

    fixtures, err := parseCommitmentTxFixtures()
    require.NoError(t, err)
    require.NotEmpty(t, fixtures)

    if len(fixtures.Valid) > 0 {
        t.Run("valid", func(t *testing.T) {
            for _, f := range fixtures.Valid {
                // Test valid cases
                commitmentTx, vtxoTree, connAddr, _, err := builder.BuildCommitmentTx(
                    pubkey, f.Intents, []ports.BoardingInput{}, cosignersPublicKeys,
                )
                require.NoError(t, err)
                require.NotEmpty(t, commitmentTx)
                require.Len(t, vtxoTree.Leaves(), f.ExpectedNumOfLeaves)
            }
        })
    }

    if len(fixtures.Invalid) > 0 {
        t.Run("invalid", func(t *testing.T) {
            for _, f := range fixtures.Invalid {
                // Test invalid cases
                commitmentTx, vtxoTree, connAddr, _, err := builder.BuildCommitmentTx(
                    pubkey, f.Intents, []ports.BoardingInput{}, cosignersPublicKeys,
                )
                require.EqualError(t, err, f.ExpectedErr)
                require.Empty(t, commitmentTx)
            }
        })
    }
}

// Fixture structure
type commitmentTxFixtures struct {
    Valid []struct {
        Intents             []domain.Intent
        ExpectedNumOfLeaves int
    }
    Invalid []struct {
        Intents     []domain.Intent
        ExpectedErr string
    }
}

func parseCommitmentTxFixtures() (*commitmentTxFixtures, error) {
    file, err := os.ReadFile("testdata/fixtures.json")
    if err != nil {
        return nil, err
    }
    var fixtures commitmentTxFixtures
    if err := json.Unmarshal(file, &fixtures); err != nil {
        return nil, err
    }
    return &fixtures, nil
}
```

## Fulmine E2E Setup Patterns

### Pre-Test Environment Refill

```go
// fulmine/internal/test/e2e/main_test.go:32-64
func refillArkd(ctx context.Context) error {
    arkdExec := "docker exec arkd arkd"
    balanceThreshold := 5.0

    command := fmt.Sprintf("%s wallet balance", arkdExec)
    out, err := runCommand(ctx, command)
    if err != nil {
        return err
    }

    re := regexp.MustCompile(`available:\s*([0-9]+\.[0-9]+)`)
    balance, err := strconv.ParseFloat(re.FindStringSubmatch(out)[1], 64)
    if err != nil {
        return err
    }

    if delta := balanceThreshold - balance; delta >= 1 {
        command := fmt.Sprintf("%s wallet address", arkdExec)
        address, err := runCommand(ctx, command)
        if err != nil {
            return err
        }

        for range int(delta) {
            if err := faucet(ctx, strings.TrimSpace(address), 1); err != nil {
                return err
            }
        }
    }

    time.Sleep(5 * time.Second)
    return nil
}
```

### Fulmine Client Refill

```go
// fulmine/internal/test/e2e/main_test.go:74-104
func refillFulmine(ctx context.Context, url string) error {
    balanceThreshold := 100000

    f, err := newFulmineClient(url)
    if err != nil {
        return err
    }

    balance, err := f.GetBalance(ctx, &pb.GetBalanceRequest{})
    if err != nil {
        return err
    }
    if int(balance.GetAmount()) >= balanceThreshold {
        return nil
    }

    if delta := balanceThreshold - int(balance.GetAmount()); delta > 0 {
        address, err := f.GetOnboardAddress(ctx, &pb.GetOnboardAddressRequest{})
        if err != nil {
            return err
        }
        amountInBtc := float64(delta) / 100000000
        if err := faucet(ctx, address.GetAddress(), amountInBtc); err != nil {
            return err
        }
    }

    time.Sleep(5 * time.Second)
    _, err = f.Settle(ctx, &pb.SettleRequest{})
    return err
}
```

## Test Timing Patterns

### Block Confirmation Waits

```go
// Wait for transaction to be confirmed
err = generateBlocks(1)
require.NoError(t, err)
time.Sleep(5 * time.Second)
```

### Multiple Confirmations for Unroll

```go
// internal/test/e2e/e2e_test.go:329-338
// Unroll the whole chain until the checkpoint tx
err = bob.Unroll(t.Context())
require.NoError(t, err)

// Generate blocks and wait for confirmation
err = generateBlocks(1)
require.NoError(t, err)
time.Sleep(5 * time.Second)
err = generateBlocks(1)
require.NoError(t, err)
time.Sleep(5 * time.Second)

// Finish the unroll and broadcast the ark tx
err = bob.Unroll(t.Context())
require.NoError(t, err)
```

## Error Testing Patterns

### Expected Error Verification

```go
// internal/test/e2e/e2e_test.go:446-469
t.Run("with boarding inputs", func(t *testing.T) {
    alice := setupArkSDK(t)
    bob := setupArkSDK(t)

    _, _, aliceBoardingAddr, err := alice.Receive(t.Context())
    require.NoError(t, err)

    bobOnchainAddr, _, _, err := bob.Receive(t.Context())
    require.NoError(t, err)

    faucetOffchain(t, alice, 0.00021)
    faucetOnchain(t, aliceBoardingAddr, 0.001)
    time.Sleep(5 * time.Second)

    _, err = alice.CollaborativeExit(t.Context(), bobOnchainAddr, 21000)
    require.Error(t, err)
    require.ErrorContains(t, err, "include onchain inputs and outputs")
})
```

### Double-Spend Prevention Test

```go
// internal/test/e2e/e2e_test.go:238-244
// Try to redeem same notes again - should fail
_, err = alice.RedeemNotes(t.Context(), []string{note1})
require.Error(t, err)
_, err = alice.RedeemNotes(t.Context(), []string{note2})
require.Error(t, err)
_, err = alice.RedeemNotes(t.Context(), []string{note1, note2})
require.Error(t, err)
```

## Test Helper Functions

### Random Hex Generation

```go
// internal/infrastructure/tx-builder/covenantless/builder_test.go:137-142
func randomHex(len int) string {
    buf := make([]byte, len)
    rand.Read(buf)
    return hex.EncodeToString(buf)
}
```

### Random Input Generator

```go
// internal/infrastructure/tx-builder/covenantless/builder_test.go:125-135
func randomInput() []ports.TxInput {
    txid := randomHex(32)
    input := ports.TxInput{
        Txid:   txid,
        Index:  0,
        Script: "a914ea9f486e82efb3dd83a69fd96e3f0113757da03c87",
        Value:  1000,
    }
    return []ports.TxInput{input}
}
```

### Time Parser Helper

```go
// internal/core/application/service_test.go:64-68
func parseTime(t *testing.T, value string) time.Time {
    tm, err := time.ParseInLocation(time.DateTime, value, time.UTC)
    require.NoError(t, err)
    return tm
}
```

## Test Organization

### Subtest Grouping

```go
func TestCollaborativeExit(t *testing.T) {
    t.Run("valid", func(t *testing.T) {
        t.Run("with change", func(t *testing.T) {
            // Test case
        })

        t.Run("without change", func(t *testing.T) {
            // Test case
        })
    })

    t.Run("invalid", func(t *testing.T) {
        t.Run("with boarding inputs", func(t *testing.T) {
            // Test case
        })
    })
}
```

## Running Tests

```bash
# Run E2E tests (requires nigiri running)
cd ark && go test -v ./internal/test/e2e/...

# Run specific E2E test
go test -v -run TestBatchSession ./internal/test/e2e/...

# Run unit tests
go test -v ./internal/core/application/...
go test -v ./internal/infrastructure/tx-builder/covenantless/...

# Run with race detector
go test -race -v ./...

# Fulmine E2E tests
cd fulmine && go test -v ./internal/test/e2e/...
```

## Related Skills

- `ark-sdk-client-init` - SDK initialization patterns used in tests
- `ark-sdk-payments` - Payment operations tested
- `arkd-round-lifecycle` - Batch session testing
