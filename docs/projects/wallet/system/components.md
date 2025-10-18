# Arkade Wallet — Component Library

This document describes the component structure and UI patterns used in Arkade Wallet.

## Component Organization

### Directory Structure

```
src/
├── App.tsx                    # Root component, routing
├── index.tsx                  # Entry point
├── components/                # Reusable components
│   ├── AddressDisplay.tsx
│   ├── BalanceCard.tsx
│   ├── QRCode.tsx
│   ├── QRScanner.tsx
│   ├── TransactionItem.tsx
│   ├── TransactionList.tsx
│   ├── VTXOItem.tsx
│   ├── LoadingSpinner.tsx
│   ├── ErrorBoundary.tsx
│   └── ...
├── screens/                   # Full-page components
│   ├── Init/
│   │   ├── CreateWallet.tsx
│   │   ├── RestoreWallet.tsx
│   │   └── SeedPhrase.tsx
│   ├── Wallet/
│   │   ├── Home.tsx
│   │   ├── Send.tsx
│   │   ├── Receive.tsx
│   │   └── VTXOs.tsx
│   ├── Settings/
│   │   ├── Network.tsx
│   │   ├── Server.tsx
│   │   └── Security.tsx
│   └── Apps/
│       ├── Lightning.tsx
│       └── SwapStatus.tsx
├── providers/                 # Context providers
│   ├── WalletProvider.tsx
│   ├── NetworkProvider.tsx
│   └── ThemeProvider.tsx
└── lib/                       # Utilities
    ├── db.ts                  # Dexie database
    ├── utils.ts
    └── constants.ts
```

## Core Patterns

### Component Types

**1. Screen Components** (`screens/`):
- Full-page components
- Connected to providers via useContext
- Handle routing and navigation
- Compose smaller reusable components

**2. Reusable Components** (`components/`):
- Presentational components
- Accept props, minimal state
- Reusable across screens
- Focused single responsibility

**3. Provider Components** (`providers/`):
- Context providers for global state
- Business logic coordination
- Wrap App or specific subtrees

### Naming Conventions

- **PascalCase**: Component files and names (`TransactionList.tsx`)
- **camelCase**: Functions, variables (`getBalance`, `isLoading`)
- **UPPER_SNAKE_CASE**: Constants (`MAX_AMOUNT`, `DEFAULT_FEE`)

## Reusable Components

### AddressDisplay

**Purpose**: Display Bitcoin/Ark addresses with copy functionality

**Props**:
```typescript
interface AddressDisplayProps {
  address: string;
  label?: string;
  showQR?: boolean;
  onCopy?: () => void;
}
```

**Usage**:
```typescript
<AddressDisplay
  address="ark1qxyzabc123..."
  label="Your Ark Address"
  showQR={true}
/>
```

**Features**:
- Truncates long addresses for mobile (e.g., `ark1qxy...abc123`)
- Copy to clipboard button
- Optional QR code display
- Visual feedback on copy

### BalanceCard

**Purpose**: Display wallet balance with on-chain and off-chain breakdown

**Props**:
```typescript
interface BalanceCardProps {
  onchain: number;      // sats
  offchain: number;     // sats
  loading?: boolean;
  onRefresh?: () => void;
}
```

**Usage**:
```typescript
<BalanceCard
  onchain={balance.onchain}
  offchain={balance.offchain}
  loading={isLoading}
  onRefresh={refreshBalance}
/>
```

**Features**:
- Displays total balance (onchain + offchain)
- Breakdown with labels
- Loading skeleton
- Pull-to-refresh support (mobile)

### QRCode

**Purpose**: Generate and display QR codes for addresses

**Props**:
```typescript
interface QRCodeProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';  // Error correction
}
```

**Implementation**:
```typescript
import qr from 'qr';

const QRCode: React.FC<QRCodeProps> = ({ value, size = 256, level = 'M' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const matrix = qr(value);
      renderQR(canvasRef.current, matrix, size);
    }
  }, [value, size]);

  return <canvas ref={canvasRef} />;
};
```

**Usage**:
```typescript
<QRCode
  value="ark1qxyzabc123..."
  size={300}
  level="M"
/>
```

### QRScanner

**Purpose**: Scan QR codes using device camera

**Props**:
```typescript
interface QRScannerProps {
  onScan: (result: string) => void;
  onError?: (error: Error) => void;
  facingMode?: 'user' | 'environment';
}
```

**Implementation**:
```typescript
import { QrReader } from 'react-qr-reader';

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError, facingMode = 'environment' }) => {
  return (
    <QrReader
      onResult={(result, error) => {
        if (result) {
          onScan(result.getText());
        }
        if (error) {
          onError?.(error);
        }
      }}
      constraints={{ facingMode }}
    />
  );
};
```

**Usage**:
```typescript
<QRScanner
  onScan={(address) => setRecipient(address)}
  facingMode="environment"  // Back camera
/>
```

### TransactionItem

**Purpose**: Display a single transaction in history

**Props**:
```typescript
interface TransactionItemProps {
  txid: string;
  type: 'send' | 'receive';
  amount: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  onPress?: () => void;
}
```

**Usage**:
```typescript
<TransactionItem
  txid="abc123..."
  type="send"
  amount={10000}
  timestamp={Date.now()}
  status="confirmed"
  onPress={() => navigate(`/transaction/${txid}`)}
/>
```

**Features**:
- Icon based on type (send/receive)
- Color coding (red for send, green for receive)
- Status indicator (pending spinner, confirmed checkmark)
- Relative timestamp ("2 minutes ago")

### TransactionList

**Purpose**: Display list of transactions with filtering and sorting

**Props**:
```typescript
interface TransactionListProps {
  transactions: Transaction[];
  filter?: 'all' | 'send' | 'receive';
  sortBy?: 'timestamp' | 'amount';
  onTransactionPress?: (txid: string) => void;
}
```

**Usage**:
```typescript
const transactions = useLiveQuery(() =>
  db.transactions.orderBy('timestamp').reverse().toArray()
);

<TransactionList
  transactions={transactions}
  filter="all"
  sortBy="timestamp"
  onTransactionPress={(txid) => navigate(`/transaction/${txid}`)}
/>
```

**Features**:
- Virtualized list for performance (future optimization)
- Filter by type
- Sort by timestamp or amount
- Empty state when no transactions

### VTXOItem

**Purpose**: Display a single VTXO with expiry and status

**Props**:
```typescript
interface VTXOItemProps {
  id: string;
  amount: number;
  expiry: number;       // Unix timestamp
  status: 'active' | 'expired' | 'spent';
  onPress?: () => void;
}
```

**Usage**:
```typescript
<VTXOItem
  id="vtxo_abc123"
  amount={50000}
  expiry={Date.now() + 86400000}  // 24 hours
  status="active"
  onPress={() => showVTXODetails(id)}
/>
```

**Features**:
- Expiry countdown ("Expires in 6 days")
- Status badge (active, expired, spent)
- Amount display in sats and BTC

### LoadingSpinner

**Purpose**: Display loading state

**Props**:
```typescript
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  fullScreen?: boolean;
}
```

**Usage**:
```typescript
<LoadingSpinner size="medium" fullScreen={true} />
```

**Implementation**:
```typescript
import { IonSpinner } from '@ionic/react';

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  fullScreen = false
}) => {
  const spinner = <IonSpinner name="crescent" />;

  if (fullScreen) {
    return (
      <div className="loading-container">
        {spinner}
      </div>
    );
  }

  return spinner;
};
```

### ErrorBoundary

**Purpose**: Catch React errors and display fallback UI

**Props**:
```typescript
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}
```

**Implementation**:
```typescript
class ErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback />;
    }

    return this.props.children;
  }
}
```

**Usage**:
```typescript
<ErrorBoundary fallback={<ErrorScreen />}>
  <App />
</ErrorBoundary>
```

## Screen Components

### Init Screens

**CreateWallet.tsx**:
- Generate new BIP39 seed phrase
- Display 12 or 24 words
- Confirmation step (re-enter words)
- Optional password setup

**RestoreWallet.tsx**:
- Input existing seed phrase
- Validate mnemonic
- Restore wallet from seed

**SeedPhrase.tsx**:
- Display seed words in grid
- Copy all words button
- Warning about security

### Wallet Screens

**Home.tsx**:
- Balance card
- Transaction list
- Quick action buttons (Send, Receive)
- Pull-to-refresh

**Send.tsx**:
- Recipient address input
- Amount input (sats or BTC)
- QR scanner button
- Fee selection (on-chain only)
- Confirmation modal

**Receive.tsx**:
- Tab selector (On-chain boarding / Off-chain Ark)
- Address display with QR code
- Copy address button
- Share button (mobile)

**VTXOs.tsx**:
- List of all VTXOs
- Filter by status (active, expired, spent)
- Expiry countdown
- Total VTXO balance

### Settings Screens

**Network.tsx**:
- Network selector (testnet, mainnet, signet, mutinynet)
- Warning when switching networks

**Server.tsx**:
- arkd server URL input
- Connection status indicator
- Default server restore button

**Security.tsx**:
- Wallet password setup
- Seed phrase backup reminder
- Auto-lock timeout

### Apps Screens

**Lightning.tsx**:
- Swap type selector (on-chain → Lightning, Lightning → on-chain)
- Amount input
- Invoice input (for submarine swaps)
- Fee display
- Initiate swap button

**SwapStatus.tsx**:
- Swap progress indicator
- Status messages
- HTLC details
- Transaction IDs (on-chain and Lightning)

## Ionic Components Used

### Layout

- **IonApp**: Root application wrapper
- **IonPage**: Full-page container
- **IonHeader**: Page header
- **IonContent**: Scrollable content area
- **IonFooter**: Page footer

### Navigation

- **IonRouter**: React Router wrapper
- **IonTabs**: Tab-based navigation
- **IonTabBar**: Tab bar at bottom
- **IonTabButton**: Individual tab button
- **IonBackButton**: Back navigation button

### UI Elements

- **IonButton**: Buttons (primary, secondary, outline, clear)
- **IonInput**: Text input fields
- **IonTextarea**: Multi-line text input
- **IonItem**: List item container
- **IonList**: List container
- **IonCard**: Card container
- **IonCardHeader**, **IonCardContent**: Card sections
- **IonLabel**: Text labels
- **IonIcon**: Icons from Ionicons

### Feedback

- **IonSpinner**: Loading indicator
- **IonAlert**: Alert dialogs
- **IonToast**: Toast notifications
- **IonModal**: Modal overlays
- **IonLoading**: Full-screen loading overlay

### Forms

- **IonSegment**, **IonSegmentButton**: Segmented controls
- **IonToggle**: Toggle switches
- **IonCheckbox**: Checkboxes
- **IonRadio**, **IonRadioGroup**: Radio buttons
- **IonSelect**, **IonSelectOption**: Dropdowns

## Styling Approach

### CSS Custom Properties

Ionic uses CSS variables for theming:

```css
:root {
  --ion-color-primary: #5856d6;
  --ion-color-secondary: #32db64;
  --ion-color-danger: #f04141;
  --ion-color-light: #f4f4f4;
  --ion-color-dark: #222;
}
```

### Component-Level Styles

**CSS Modules** (future):
```typescript
import styles from './BalanceCard.module.css';

<div className={styles.balanceCard}>
  {/* ... */}
</div>
```

**Inline Styles** (current, minimal use):
```typescript
<div style={{ padding: '16px', backgroundColor: '#fff' }}>
  {/* ... */}
</div>
```

**Global Styles** (`src/index.css`):
```css
.balance-card {
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

### Dark Mode

**Detection**:
```typescript
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

if (prefersDark.matches) {
  document.body.classList.add('dark');
}
```

**Ionic Dark Mode**:
```css
body.dark {
  --ion-color-primary: #7c79ff;
  --ion-background-color: #1a1a1a;
  --ion-text-color: #ffffff;
}
```

## Component Composition Patterns

### Container/Presenter Pattern

**Container** (logic):
```typescript
const HomeContainer = () => {
  const { balance, transactions } = useWallet();
  const [loading, setLoading] = useState(false);

  const refreshBalance = async () => {
    setLoading(true);
    await wallet.syncBalance();
    setLoading(false);
  };

  return (
    <HomePresenter
      balance={balance}
      transactions={transactions}
      loading={loading}
      onRefresh={refreshBalance}
    />
  );
};
```

**Presenter** (UI):
```typescript
const HomePresenter = ({ balance, transactions, loading, onRefresh }) => (
  <IonPage>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Home</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent>
      <BalanceCard {...balance} loading={loading} onRefresh={onRefresh} />
      <TransactionList transactions={transactions} />
    </IonContent>
  </IonPage>
);
```

### Render Props Pattern

```typescript
<WalletLoader>
  {({ wallet, loading, error }) => {
    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorDisplay error={error} />;
    return <WalletHome wallet={wallet} />;
  }}
</WalletLoader>
```

### Higher-Order Components

```typescript
function withAuth<P>(Component: React.ComponentType<P>) {
  return (props: P) => {
    const { wallet } = useWallet();

    if (!wallet) {
      return <Navigate to="/init" />;
    }

    return <Component {...props} />;
  };
}

export default withAuth(SendScreen);
```

## Performance Considerations

### Memoization

**React.memo**:
```typescript
const TransactionItem = React.memo(({ txid, amount, timestamp }) => {
  // Component only re-renders if props change
  return <div>{amount} sats at {timestamp}</div>;
});
```

**useMemo**:
```typescript
const totalBalance = useMemo(() => {
  return balance.onchain + balance.offchain;
}, [balance.onchain, balance.offchain]);
```

**useCallback**:
```typescript
const handleSend = useCallback((address: string, amount: number) => {
  wallet.send({ address, amount });
}, [wallet]);
```

### Virtualization

**Future optimization** for long transaction lists:
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={transactions.length}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>
      <TransactionItem {...transactions[index]} />
    </div>
  )}
</FixedSizeList>
```

## Accessibility

### ARIA Labels

```typescript
<IonButton
  aria-label="Copy address to clipboard"
  onClick={copyAddress}
>
  <IonIcon icon={copyOutline} />
</IonButton>
```

### Keyboard Navigation

```typescript
<input
  type="text"
  value={address}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }}
/>
```

### Screen Reader Support

Ionic components include built-in ARIA attributes and roles for accessibility.

## Testing Components

**Example Test**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { BalanceCard } from './BalanceCard';

test('displays balance correctly', () => {
  render(<BalanceCard onchain={100000} offchain={50000} />);

  expect(screen.getByText('150,000 sats')).toBeInTheDocument();
  expect(screen.getByText('On-chain: 100,000 sats')).toBeInTheDocument();
  expect(screen.getByText('Off-chain: 50,000 sats')).toBeInTheDocument();
});

test('calls onRefresh when refresh button clicked', () => {
  const onRefresh = vi.fn();
  render(<BalanceCard onchain={0} offchain={0} onRefresh={onRefresh} />);

  fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

  expect(onRefresh).toHaveBeenCalledTimes(1);
});
```

## Component Checklist

When creating a new component:

- ✅ Define TypeScript interface for props
- ✅ Add JSDoc comments for complex logic
- ✅ Handle loading and error states
- ✅ Add ARIA labels for accessibility
- ✅ Memoize where appropriate
- ✅ Write unit tests
- ✅ Document usage in this file
