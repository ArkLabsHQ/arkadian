# Bancod — API Reference

## BancoService (gRPC + REST)

| RPC | REST | Description |
|-----|------|-------------|
| `AddPair` | `POST /v1/pair` | Add a trading pair |
| `UpdatePair` | `PUT /v1/pair` | Update pair config |
| `RemovePair` | `DELETE /v1/pair/{pair}` | Remove a trading pair |
| `ListPairs` | `GET /v1/pairs` | List all configured pairs |
| `GetStatus` | `GET /v1/status` | Check solver running status |
| `GetBalance` | `GET /v1/balance` | Get wallet balances |
| `GetAddress` | `GET /v1/address` | Get offchain + boarding addresses |
| `ListTrades` | `GET /v1/trades` | List trade history |

## PreimageService (gRPC + REST)

| RPC | REST | Description |
|-----|------|-------------|
| `GetSolverPubKey` | `GET /v1/preimage/solver-pubkey` | Get ECIES encryption pubkey |

## Key Message Types

### PairInfo
```protobuf
message PairInfo {
  string pair = 1;        // e.g., "BTC/USDT"
  uint64 min_amount = 2;
  uint64 max_amount = 3;
  string price_feed = 6;  // CoinGecko URL
  bool invert_price = 7;
}
```

### GetBalanceResponse
```protobuf
message GetBalanceResponse {
  uint64 onchain_confirmed = 1;
  uint64 onchain_unconfirmed = 2;
  uint64 offchain_settled = 3;
  uint64 offchain_pending = 4;
  uint64 offchain_swept = 5;
}
```

### TradeInfo
```protobuf
message TradeInfo {
  int64 id = 1;
  string pair = 2;
  string deposit_asset = 3;
  uint64 deposit_amount = 4;
  string want_asset = 5;
  uint64 want_amount = 6;
  string offer_txid = 7;
  string fulfill_txid = 8;
  int64 created_at = 9;
}
```
