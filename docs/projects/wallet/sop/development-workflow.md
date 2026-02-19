# Development Workflow

This document outlines the standard development workflow for the Arkade wallet.

## Setting Up Development Environment

### Prerequisites

1. **Install Node.js**
   - Version: >= 20
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **Install pnpm**
   ```bash
   npm install -g pnpm
   ```
   - Version: >= 8
   - Verify: `pnpm --version`

3. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd wallet
   ```

4. **Install Dependencies**
   ```bash
   pnpm install
   ```
   - Installs all dependencies from package.json
   - Uses pnpm for faster, more efficient installation

## Running Locally

### Start Development Server

```bash
pnpm run start
```

- Builds worker with: `pnpm build:worker`
- Generates git info
- Starts Vite dev server
- Access at: http://localhost:3002
- Hot Module Replacement (HMR) enabled

### Development Features

- **Auto-compilation**: TypeScript compiles automatically
- **Hot Reload**: Save triggers instant browser reload
- **Fast Refresh**: React components update without full reload

## Making Changes

### Edit Components

1. Navigate to `src/` directory
2. Edit component files (.tsx)
3. Save changes
4. Browser auto-refreshes

### TypeScript Development

- TypeScript checks run automatically in editor
- Compilation errors shown in terminal
- Type definitions in `src/types/` or inline

## Code Quality Checks

### Linting

```bash
pnpm run lint
```
- Runs ESLint on .ts and .tsx files
- Checks code style and patterns
- Fix issues before committing

### Formatting

```bash
# Format all files
pnpm run format

# Check formatting without changes
pnpm run format:check
```
- Uses Prettier for consistent code style
- Runs on src/ directory

## Git Workflow

### Standard Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Edit code
   - Save files
   - Test locally

3. **Run Quality Checks**
   ```bash
   pnpm run lint
   pnpm run format:check
   pnpm run test
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```
   - Husky pre-commit hooks run automatically
   - Checks linting and formatting

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   - Create Pull Request on GitHub
   - Request review

## Testing Changes

### Unit Tests

```bash
# Run tests once
pnpm run test

# Run tests with UI
pnpm run test:ui

# Run with coverage
pnpm run test:coverage
```

### E2E Tests (Playwright)

```bash
# Start test services (arkd + nak Nostr relay)
docker compose -f test.docker-compose.yml up -d

# Run all E2E tests
pnpm exec playwright test

# Run specific test file
pnpm exec playwright test src/test/e2e/send.test.ts

# Run with Playwright UI
pnpm exec playwright test --ui

# Stop test services
docker compose -f test.docker-compose.yml down
```

### Manual Testing

1. **Browser Testing**
   - Test in Chrome, Firefox, Safari
   - Check console for errors
   - Verify functionality

2. **Mobile Testing**
   - Open browser DevTools
   - Toggle device toolbar (responsive mode)
   - Test on different screen sizes
   - Test touch interactions

3. **PWA Testing**
   - Test offline functionality
   - Verify service worker registration
   - Test app installation

## Building

### Production Build

```bash
pnpm run build
```

- Builds worker first
- Generates git info
- Creates optimized production bundle
- Output: `dist/` folder

### Verify Build

1. Check `dist/` directory exists
2. Verify files are minified
3. Check bundle size
4. Test production build locally (use serve or similar)

## Pull Request Checklist

Before submitting a PR, ensure:

- [ ] All tests pass (`pnpm run test`)
- [ ] Lint passes (`pnpm run lint`)
- [ ] Format checked (`pnpm run format:check`)
- [ ] No TypeScript errors
- [ ] Tested manually in browser
- [ ] Tested responsive layout
- [ ] Code reviewed locally
- [ ] Commit messages are clear
- [ ] No console errors or warnings
- [ ] Documentation updated (if needed)
