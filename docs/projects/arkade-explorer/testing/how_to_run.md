# Arkade Explorer - How to Run

## Development Server

### Quick Start

```bash
# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

The development server starts at `http://localhost:5173` with:
- Hot Module Replacement (HMR)
- Fast refresh on code changes
- Source maps for debugging

### Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 5173) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## Production Build

### Build Steps

```bash
# 1. Build the project
npm run build

# 2. Output is in dist/
ls dist/
# index.html  assets/  favicon.svg
```

### Build Output

```
dist/
├── index.html           # Entry point
├── favicon.svg          # Favicon
└── assets/
    ├── index-[hash].js  # Main bundle
    ├── index-[hash].css # Styles
    └── vendor-[hash].js # Dependencies (chunked)
```

### Preview Production Build

```bash
npm run preview
```

Opens at `http://localhost:4173` with production-optimized code.

---

## Environment Configuration

### Environment Variables

Create `.env` in project root:

```env
# Arkade Indexer API URL
VITE_INDEXER_URL=https://indexer.arkadeos.com
```

### Environment File Hierarchy

Vite loads environment files in this order:
1. `.env` - Always loaded
2. `.env.local` - Local overrides (git-ignored)
3. `.env.development` - Dev mode only
4. `.env.production` - Production build only

### Accessing Variables in Code

```typescript
const indexerUrl = import.meta.env.VITE_INDEXER_URL;
```

**Note**: Only variables prefixed with `VITE_` are exposed to the client.

---

## Running with Different Indexers

### Local Indexer

```bash
# Start local indexer (from ark project)
# Then configure explorer:
echo "VITE_INDEXER_URL=http://localhost:7070" > .env.local
npm run dev
```

### Staging Indexer

```bash
echo "VITE_INDEXER_URL=https://staging-indexer.arkadeos.com" > .env.local
npm run dev
```

### Production Indexer (Default)

```bash
# Use default .env
npm run dev
```

---

## Docker (Optional)

### Build Docker Image

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

### Run Container

```bash
docker build -t arkade-explorer .
docker run -p 8080:80 arkade-explorer
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 5173
lsof -i :5173

# Kill process
kill -9 <PID>

# Or use different port
npm run dev -- --port 3000
```

### Node Version Issues

```bash
# Check Node version
node -v  # Should be 18+

# Use nvm to switch
nvm use 18
```

### Dependencies Not Found

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Fails

```bash
# Check TypeScript errors
npm run lint

# Check for type errors
npx tsc --noEmit
```

### Environment Variables Not Working

1. Ensure variable starts with `VITE_`
2. Restart dev server after changing `.env`
3. Check for typos in variable names

---

## Performance Optimization

### Development

- HMR is enabled by default
- Source maps for debugging
- No minification

### Production

- Code minification (Terser)
- CSS minification (cssnano)
- Tree shaking
- Chunk splitting
- Asset hashing for caching

### Build Stats

| Metric | Value |
|--------|-------|
| Build Time | ~5-6 seconds |
| JS Bundle | ~261 KB (gzip: ~82 KB) |
| CSS Bundle | ~16 KB (gzip: ~4 KB) |
| HMR Speed | < 1 second |

---

## IDE Setup

### VS Code Extensions

- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)
- Tailwind CSS IntelliSense

### Recommended Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```
