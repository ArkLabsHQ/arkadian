# Adding Features

This document provides step-by-step guides for adding new features to the Arkade wallet.

## Planning a New Feature

### Before You Start

1. **Define Requirements**
   - What problem does this solve?
   - What are the acceptance criteria?
   - Are there dependencies?

2. **Design UI/UX**
   - Sketch or mockup the interface
   - Ensure consistency with existing design
   - Consider mobile and desktop layouts

3. **Identify SDK Methods**
   - Review `@arkade-os/sdk` documentation
   - Identify required SDK methods
   - Check for Boltz swap integration needs

4. **Plan Component Structure**
   - Determine component hierarchy
   - Identify shared components
   - Plan state management approach

## Creating a New Screen

### Step-by-Step Process

1. **Create Screen Folder**
   ```bash
   mkdir src/screens/NewFeature
   touch src/screens/NewFeature/NewFeature.tsx
   ```

2. **Create Screen Component**
   ```typescript
   import React from 'react';
   import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/react';

   const NewFeature: React.FC = () => {
     return (
       <IonPage>
         <IonHeader>
           <IonToolbar>
             <IonTitle>New Feature</IonTitle>
           </IonToolbar>
         </IonHeader>
         <IonContent className="ion-padding">
           {/* Feature content */}
         </IonContent>
       </IonPage>
     );
   };

   export default NewFeature;
   ```

3. **Add Route in App.tsx**
   ```typescript
   import NewFeature from './screens/NewFeature/NewFeature';

   // In router configuration
   <Route path="/new-feature" component={NewFeature} exact />
   ```

4. **Add Navigation Link**
   ```typescript
   import { IonButton } from '@ionic/react';
   import { useHistory } from 'react-router-dom';

   const history = useHistory();
   <IonButton onClick={() => history.push('/new-feature')}>
     Go to New Feature
   </IonButton>
   ```

5. **Style with Ionic Components**
   - Use Ionic components for consistency
   - Apply CSS variables for theming
   - Ensure responsive layout

## Creating a New Component

### Step-by-Step Process

1. **Create Component File**
   ```bash
   mkdir src/components/NewComponent
   touch src/components/NewComponent/NewComponent.tsx
   ```

2. **Define TypeScript Props Interface**
   ```typescript
   import React from 'react';

   interface NewComponentProps {
     title: string;
     onAction: () => void;
     isLoading?: boolean;
   }

   const NewComponent: React.FC<NewComponentProps> = ({
     title,
     onAction,
     isLoading = false
   }) => {
     return (
       <div className="new-component">
         <h3>{title}</h3>
         <button onClick={onAction} disabled={isLoading}>
           {isLoading ? 'Loading...' : 'Action'}
         </button>
       </div>
     );
   };

   export default NewComponent;
   ```

3. **Add to Index (if needed)**
   ```typescript
   // src/components/index.ts
   export { default as NewComponent } from './NewComponent/NewComponent';
   ```

4. **Write Tests**
   ```typescript
   import { render, screen, fireEvent } from '@testing-library/react';
   import NewComponent from './NewComponent';

   describe('NewComponent', () => {
     it('renders title correctly', () => {
       render(<NewComponent title="Test" onAction={() => {}} />);
       expect(screen.getByText('Test')).toBeInTheDocument();
     });

     it('calls onAction when button clicked', () => {
       const mockAction = jest.fn();
       render(<NewComponent title="Test" onAction={mockAction} />);
       fireEvent.click(screen.getByText('Action'));
       expect(mockAction).toHaveBeenCalledTimes(1);
     });
   });
   ```

## Integrating SDK Functionality

### Using @arkade-os/sdk

1. **Import SDK Methods**
   ```typescript
   import { ArkClient } from '@arkade-os/sdk';
   ```

2. **Use in Provider or Component**
   ```typescript
   const MyComponent: React.FC = () => {
     const [balance, setBalance] = useState<number>(0);

     useEffect(() => {
       async function fetchBalance() {
         try {
           const client = new ArkClient(serverUrl);
           const result = await client.getBalance();
           setBalance(result);
         } catch (error) {
           console.error('Failed to fetch balance:', error);
           // Handle error appropriately
         }
       }
       fetchBalance();
     }, []);

     return <div>Balance: {balance}</div>;
   };
   ```

3. **Handle Errors Appropriately**
   ```typescript
   try {
     await arkClient.sendPayment(params);
   } catch (error) {
     if (error instanceof NetworkError) {
       showToast('Network error. Please check connection.');
     } else {
       showToast('Payment failed. Please try again.');
     }
   }
   ```

4. **Update Types if Needed**
   - Add type definitions in `src/types/`
   - Extend existing interfaces
   - Document custom types

## Adding a New Provider

### Step-by-Step Process

1. **Create Provider File**
   ```bash
   touch src/providers/NewProvider.tsx
   ```

2. **Define Context Interface**
   ```typescript
   import React, { createContext, useContext, useState } from 'react';

   interface NewContextType {
     value: string;
     setValue: (value: string) => void;
   }

   const NewContext = createContext<NewContextType | undefined>(undefined);
   ```

3. **Implement Provider Component**
   ```typescript
   export const NewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
     const [value, setValue] = useState<string>('');

     return (
       <NewContext.Provider value={{ value, setValue }}>
         {children}
       </NewContext.Provider>
     );
   };
   ```

4. **Wrap in App.tsx**
   ```typescript
   import { NewProvider } from './providers/NewProvider';

   function App() {
     return (
       <NewProvider>
         {/* Other providers and components */}
       </NewProvider>
     );
   }
   ```

5. **Export useContext Hook**
   ```typescript
   export const useNew = () => {
     const context = useContext(NewContext);
     if (!context) {
       throw new Error('useNew must be used within NewProvider');
     }
     return context;
   };
   ```

## State Management Pattern

### Global State (Context)

Use React Context for state shared across multiple components:
- User authentication
- Wallet configuration
- Theme preferences

### Local State (useState)

Use useState for component-specific state:
- Form inputs
- UI toggles
- Temporary values

### Persistent State (Dexie)

Use Dexie hooks for data that persists:
```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

const transactions = useLiveQuery(() => db.transactions.toArray());
```

## Styling New Components

### Follow Existing Patterns

1. **Use Ionic CSS Variables**
   ```css
   .my-component {
     color: var(--ion-color-primary);
     background: var(--ion-background-color);
   }
   ```

2. **Support Dark Mode**
   ```css
   @media (prefers-color-scheme: dark) {
     .my-component {
       /* Dark mode styles */
     }
   }
   ```

3. **Test Responsive Layout**
   - Test on mobile (< 768px)
   - Test on tablet (768px - 1024px)
   - Test on desktop (> 1024px)

## Testing New Features

### Unit Tests

```bash
pnpm run test
```

Write tests for:
- Component rendering
- User interactions
- State changes
- Error handling

### Browser Testing

Test in multiple browsers:
- Chrome
- Firefox
- Safari
- Mobile browsers

### PWA Testing

- Test offline functionality
- Verify service worker updates
- Test app installation
- Check push notifications (if applicable)

## Documentation

### Update README

If feature requires setup or configuration:
- Update installation instructions
- Add usage examples
- Document environment variables

### Add Inline Comments

```typescript
/**
 * Calculates the total balance including pending transactions
 * @param confirmedBalance - The confirmed balance in satoshis
 * @param pendingTxs - Array of pending transactions
 * @returns Total balance in satoshis
 */
function calculateTotalBalance(confirmedBalance: number, pendingTxs: Transaction[]): number {
  // Implementation
}
```

### Update Type Definitions

Ensure all new types are properly documented:
```typescript
interface PaymentRequest {
  /** Amount in satoshis */
  amount: number;
  /** Optional payment description */
  description?: string;
  /** Recipient address or invoice */
  recipient: string;
}
```
