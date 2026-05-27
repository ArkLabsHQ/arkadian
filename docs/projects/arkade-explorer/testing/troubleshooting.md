# Arkade Explorer -- Troubleshooting Guide

## Build Issues

### TypeScript Errors

**Diagnosis**: `pnpm exec tsc --noEmit`

**Common causes**: Missing type definitions, incorrect import paths, type mismatches.

**Solution**:
```bash
pnpm add -D @types/react @types/react-dom
# Verify tsconfig.json "include": ["src"]
```

### ESLint Errors

**Diagnosis**: `pnpm lint -- --debug`

**Common fixes**: Add missing hook dependencies, remove unused variables, ensure exports are HMR-compatible (react-refresh rule).

### Module Not Found

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## Runtime Issues

### Blank Page / White Screen

1. Open browser DevTools Console -- check for red errors
2. Check `.env` file exists with `VITE_INDEXER_URL`
3. Verify API accessibility: `curl https://indexer.arkadeos.com/v1/info`

### API Connection Failed ("Network Error" or "Failed to fetch")

**Common causes**: Indexer is down, CORS issues, wrong API URL, network connectivity.

```bash
# Verify indexer URL
cat .env

# Test indexer directly
curl https://indexer.arkadeos.com/v1/info

# Try different indexer
echo "VITE_INDEXER_URL=https://alt-indexer.example.com" > .env.local
pnpm dev
```

### Transaction Not Found

1. Wait for indexer to sync (may take a few seconds)
2. Verify correct indexer for network (testnet vs mainnet)
3. Double-check transaction ID (exactly 64 hex characters)

### VTXO Status Incorrect

Possible indexer cache lag or recent transaction not yet processed. Wait and refresh. Check indexer sync status if possible.

### Asset Icons Not Showing

1. Check `VITE_VERIFIED_ASSETS_URL` is set correctly
2. Asset may not be in the verified registry -- user must approve manually
3. Check browser console for fetch errors on the verified assets URL

---

## Development Issues

### Hot Reload Not Working

```bash
# Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
rm -rf node_modules/.vite    # Clear Vite cache
pnpm dev                     # Restart dev server
```

### Port Already in Use

```bash
lsof -i :5173
kill -9 <PID>
# Or: pnpm dev -- --port 3000
```

### Styling Not Applied (TailwindCSS)

1. Check class names for typos
2. Verify `tailwind.config.js` content paths include `"./src/**/*.{js,ts,jsx,tsx}"`
3. Check `postcss.config.js` includes tailwindcss plugin
4. Restart dev server

### Environment Variables Not Working

1. Variable must start with `VITE_`
2. Restart dev server after changing `.env`
3. Access via `import.meta.env.VITE_*` (not `process.env`)

---

## Deployment Issues

### Build Succeeds but App Doesn't Work in Production

1. Environment variables not set in hosting platform
2. SPA routing not configured (direct URL access returns 404)

**Vercel/Netlify**: Set `VITE_INDEXER_URL` in platform environment variables dashboard.

### 404 on Direct URL Access

Server doesn't handle SPA routing. Configure fallback:

**nginx**: `try_files $uri $uri/ /index.html;`
**Vercel**: Pre-configured via `vercel.json`
**Netlify**: Pre-configured via `netlify.toml`

### Docker Build Fails with `ERR_PNPM_IGNORED_BUILDS` (esbuild)

`pnpm install --frozen-lockfile` aborts in the Docker build because pnpm 11.x
treats an unbuilt dependency's postinstall (e.g. `esbuild@0.25.x`) as a hard
error. The Dockerfile must pin pnpm to a 10.x version and allowlist the
dependency:

- `Dockerfile`: `corepack prepare pnpm@10.29.2 --activate` (not `pnpm@latest`)
- `pnpm-workspace.yaml`: add `esbuild` under `onlyBuiltDependencies`

Keep the pinned version in sync with the pnpm version recorded in
`pnpm-lock.yaml`.

---

## Browser-Specific Issues

### Safari Copy Doesn't Work

The Clipboard API may fail in older Safari. The app uses `navigator.clipboard.writeText()` which requires HTTPS or localhost.

### Performance Issues

**Slow initial load**: Check bundle size with `pnpm build`. Enable lazy loading for routes if needed.

**Memory leaks**: Check for uncleared intervals/timeouts. Use Chrome DevTools Performance tab.

---

## Error Messages Reference

| Error | Cause | Solution |
|-------|-------|----------|
| `VITE_INDEXER_URL is undefined` | Missing env var | Add to .env file |
| `Module not found: @arkade-os/sdk` | Missing dependency | Run `pnpm install` |
| `Network Error` | API unreachable | Check indexer URL and connectivity |
| `Invalid hook call` | Hooks outside component | Move hooks inside function component |
| `Cannot read property of undefined` | Null data access | Add null checks or optional chaining |
| `ERR_PNPM_IGNORED_BUILDS` | pnpm 11.x rejects unbuilt dep (esbuild) in Docker | Pin pnpm to `10.29.2` and add `esbuild` to `onlyBuiltDependencies` |

---

## Getting Help

1. Check browser console for specific error messages
2. Check Network tab for API response codes
3. Search project issues: https://github.com/ArkLabsHQ/arkade-explorer/issues
4. Review the Arkade Protocol docs: https://docs.arkadeos.com/
