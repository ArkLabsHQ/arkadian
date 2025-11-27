# Arkade Explorer - Troubleshooting Guide

## Common Issues

### Build Issues

#### TypeScript Errors

**Problem**: Build fails with type errors

**Diagnosis**:
```bash
npx tsc --noEmit
```

**Common Causes**:
1. Missing type definitions
2. Incorrect import paths
3. Type mismatches in components

**Solution**:
```bash
# Check for missing types
npm install -D @types/react @types/react-dom

# Verify tsconfig.json includes all source files
# Check "include": ["src"]
```

---

#### ESLint Errors

**Problem**: `npm run lint` fails

**Diagnosis**:
```bash
npm run lint -- --debug
```

**Common Fixes**:
```typescript
// Error: React Hook useEffect has missing dependency
// Fix: Add dependency or disable rule if intentional
useEffect(() => {
  fetchData();
}, [fetchData]); // Add missing dep

// Error: Unused variable
// Fix: Remove or use the variable
const [data, setData] = useState(null); // Remove if unused
```

---

#### Module Not Found

**Problem**: `Cannot find module 'xyz'`

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# If specific package missing
npm install <package-name>
```

---

### Runtime Issues

#### Blank Page / White Screen

**Possible Causes**:
1. JavaScript error preventing render
2. Missing environment variable
3. API connection failure

**Diagnosis**:
1. Open browser DevTools Console
2. Check for red errors
3. Check Network tab for failed requests

**Solutions**:
```bash
# Check environment
echo $VITE_INDEXER_URL
cat .env

# Verify API is accessible
curl https://indexer.arkadeos.com/health
```

---

#### API Connection Failed

**Problem**: "Network Error" or "Failed to fetch"

**Diagnosis**:
```javascript
// Check in browser console
fetch('https://indexer.arkadeos.com/v1/indexer/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

**Common Causes**:
1. Indexer is down
2. CORS issues
3. Wrong API URL
4. Network connectivity

**Solutions**:
```bash
# Verify indexer URL in .env
cat .env

# Test indexer directly
curl https://indexer.arkadeos.com/v1/indexer/health

# Try different indexer
echo "VITE_INDEXER_URL=https://alt-indexer.arkadeos.com" > .env.local
npm run dev
```

---

#### Transaction Not Found

**Problem**: "Transaction not found" error for valid txid

**Possible Causes**:
1. Transaction not yet indexed
2. Wrong network (mainnet vs testnet)
3. Typo in transaction ID

**Solutions**:
1. Wait for indexer to sync (may take seconds)
2. Verify you're using correct indexer for network
3. Double-check transaction ID (64 hex chars)

---

#### VTXO Status Incorrect

**Problem**: VTXO shows wrong status (e.g., Active when Spent)

**Possible Causes**:
1. Indexer cache lag
2. Recent transaction not yet processed

**Solutions**:
1. Wait and refresh
2. Check indexer sync status
3. Verify with arkd directly if possible

---

### Development Issues

#### Hot Reload Not Working

**Problem**: Changes don't reflect in browser

**Solutions**:
```bash
# 1. Hard refresh browser
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# 2. Clear Vite cache
rm -rf node_modules/.vite

# 3. Restart dev server
npm run dev
```

---

#### Port Already in Use

**Problem**: `Error: Port 5173 is already in use`

**Solution**:
```bash
# Find and kill process
lsof -i :5173
kill -9 <PID>

# Or use different port
npm run dev -- --port 3000
```

---

#### Styling Not Applied

**Problem**: TailwindCSS classes not working

**Diagnosis**:
1. Check class names for typos
2. Verify PostCSS config
3. Check if class exists in Tailwind

**Solutions**:
```bash
# 1. Restart dev server
npm run dev

# 2. Check tailwind.config.js content paths
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // ...
}

# 3. Verify PostCSS config
cat postcss.config.js
```

---

### Deployment Issues

#### Build Succeeds but App Doesn't Work

**Common Causes**:
1. Environment variables not set in production
2. SPA routing not configured
3. Base URL mismatch

**Vercel Solution**:
```bash
# Set env vars in Vercel dashboard
# Settings > Environment Variables
# Add: VITE_INDEXER_URL = https://indexer.arkadeos.com
```

**Netlify Solution**:
```bash
# Set env vars in Netlify dashboard
# Site settings > Environment variables
# Add: VITE_INDEXER_URL = https://indexer.arkadeos.com
```

---

#### 404 on Direct URL Access

**Problem**: Direct links to `/tx/abc` return 404

**Cause**: Server doesn't handle SPA routing

**Solutions**:

**Vercel** (vercel.json):
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

**Netlify** (netlify.toml):
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Nginx**:
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

### Browser-Specific Issues

#### Safari Copy Doesn't Work

**Problem**: Copy to clipboard fails in Safari

**Solution**: Use the Clipboard API with fallback:
```typescript
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for Safari
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
};
```

---

#### Firefox Console Warnings

**Problem**: Multiple warnings in Firefox console

**Common Safe to Ignore**:
- "Source map warnings" - Development only
- "Cookie warnings" - Third-party API cookies

---

### Performance Issues

#### Slow Initial Load

**Diagnosis**:
```bash
# Check bundle size
npm run build
# Look at output sizes
```

**Solutions**:
1. Enable code splitting (already configured)
2. Lazy load routes
3. Optimize images

---

#### Memory Leaks

**Symptoms**: Page becomes slow over time

**Common Causes**:
1. Uncleared intervals/timeouts
2. Event listeners not removed
3. Infinite re-renders

**Diagnosis**: Use Chrome DevTools Performance tab

---

## Error Messages Reference

| Error | Cause | Solution |
|-------|-------|----------|
| `VITE_INDEXER_URL is undefined` | Missing env var | Add to .env file |
| `Module not found: @arkade-os/sdk` | Missing dependency | Run `npm install` |
| `Network Error` | API unreachable | Check indexer URL and connectivity |
| `Invalid hook call` | Hooks outside component | Move hooks inside function component |
| `Cannot read property of undefined` | Null data access | Add null checks or optional chaining |

---

## Getting Help

1. Check existing documentation
2. Search project issues on GitHub
3. Review browser console for specific errors
4. Check network tab for API issues
5. Contact team with error details and reproduction steps
