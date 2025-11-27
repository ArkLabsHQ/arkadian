# Arkade Explorer - Testing Guide

## Overview

Arkade Explorer uses a combination of linting, type checking, and manual testing. As a frontend application, the primary testing mechanisms are:

1. **TypeScript Type Checking** - Compile-time type safety
2. **ESLint** - Code quality and style enforcement
3. **Manual Testing** - UI/UX verification

---

## Running Tests

### Linting

```bash
npm run lint
```

Runs ESLint with:
- TypeScript-aware rules
- React hooks rules
- React Refresh rules
- Zero warnings tolerance (`--max-warnings 0`)

### Type Checking

```bash
# Via build process
npm run build

# Or standalone type check
npx tsc --noEmit
```

### Full Validation

```bash
# Run both lint and type check
npm run lint && npx tsc --noEmit
```

---

## ESLint Configuration

### Config File: `.eslintrc.cjs`

```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}
```

### Key Rules Enforced

| Rule | Description |
|------|-------------|
| TypeScript strict | No implicit any, strict null checks |
| React hooks | Exhaustive deps, rules of hooks |
| React refresh | HMR-compatible exports |
| No unused vars | Clean code |

---

## TypeScript Configuration

### Config File: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Strict Mode Checks

- `strict: true` enables all strict type checks
- `noUnusedLocals` - No dead code
- `noUnusedParameters` - No unused function params
- `noFallthroughCasesInSwitch` - Explicit case handling

---

## Manual Testing Checklist

### Homepage (`/`)

- [ ] Page loads without errors
- [ ] Search bar is visible and functional
- [ ] Feature cards display correctly
- [ ] Stats load (if connected to indexer)
- [ ] Mobile responsive layout

### Transaction Search

- [ ] Enter valid 64-char txid
- [ ] Auto-detection works (routes to correct page)
- [ ] Invalid input shows appropriate feedback
- [ ] Search from header works

### Commitment Transaction Page (`/commitment-tx/:txid`)

- [ ] Transaction details load
- [ ] All metadata displays correctly
- [ ] Batch list renders
- [ ] Copy buttons work
- [ ] Raw hex expands/collapses
- [ ] Loading state shows spinner
- [ ] Error state shows message
- [ ] Invalid txid shows error

### Address Page (`/address/:address`)

- [ ] Address statistics load
- [ ] Balance calculation correct
- [ ] VTXO list renders
- [ ] Status badges show correctly
- [ ] Pagination works (if many VTXOs)
- [ ] Copy address button works
- [ ] Links to transactions work

### Navigation

- [ ] Header links work
- [ ] Back button works correctly
- [ ] 404 page shows for invalid routes
- [ ] Deep linking works (direct URL access)

### Cross-Browser

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile browsers

---

## Testing with Different Indexers

### Local Indexer Testing

```bash
# Set up local indexer
echo "VITE_INDEXER_URL=http://localhost:7070" > .env.local
npm run dev

# Test scenarios:
# 1. Valid transaction lookup
# 2. Invalid transaction (404)
# 3. Address with multiple VTXOs
# 4. Empty address (no VTXOs)
```

### Network Error Simulation

1. Disconnect from network
2. Verify error states display correctly
3. Reconnect and verify recovery

### Slow Network Simulation

1. Use browser DevTools Network throttling
2. Select "Slow 3G"
3. Verify loading states appear
4. Verify data eventually loads

---

## Adding Tests (Future)

### Recommended Testing Stack

For future test implementation:

1. **Vitest** - Unit testing (Vite-native)
2. **React Testing Library** - Component testing
3. **Playwright** - E2E testing

### Example Vitest Setup

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
```

### Example Component Test

```typescript
// src/components/UI/Badge.test.tsx
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders with success variant', () => {
    render(<Badge variant="success">Active</Badge>)
    expect(screen.getByText('Active')).toHaveClass('bg-green')
  })
})
```

---

## Code Coverage (Future)

When tests are implemented:

```bash
# Run tests with coverage
npm run test:coverage

# Coverage targets
# Statements: 80%
# Branches: 75%
# Functions: 80%
# Lines: 80%
```

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: CI
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```
