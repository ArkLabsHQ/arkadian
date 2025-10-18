# Troubleshooting Arkade Wallet

## Common Issues

### Build Failed
1. Check Node.js >= 20: `node --version`
2. Upgrade: `nvm install 20 && nvm use 20`
3. Clear cache: `rm -rf node_modules/.vite dist && pnpm run build`

### pnpm Not Found
Install: `npm install -g pnpm` (verify: `pnpm --version` >= 8)

### Cannot Connect to arkd
1. Check server URL in Settings
2. Verify arkd: `curl http://localhost:7070/health`
3. Check network connectivity and CORS

### Transaction Failed
1. Check balance and valid recipient address
2. Verify network (testnet vs mainnet)
3. Wait for round finalization
4. Check VTXOs not expired

### PWA Not Installing
1. HTTPS required (except localhost)
2. Check manifest.json and service worker
3. Clear cache and reload

### Storage Quota Exceeded
DevTools → Application → IndexedDB → Delete database

## Development Issues

### Port 3002 in Use
```bash
lsof -ti:3002 | xargs kill -9  # macOS/Linux
vite --port 3003               # Use different port
```

### Hot Reload Not Working
1. Restart: Ctrl+C, then `pnpm run start`
2. Hard reload: Cmd+Shift+R / Ctrl+Shift+R
3. Clear cache: `rm -rf node_modules/.vite`

### TypeScript Errors
1. Run: `npx tsc --noEmit`
2. Update: `pnpm install --force`
3. Restart TS server (VSCode): Cmd+Shift+P → "TypeScript: Restart TS Server"

## Browser Issues

### General Troubleshooting
1. Clear cache (Cmd+Shift+R / Ctrl+Shift+R)
2. Open DevTools (F12), check Console
3. Verify browser: Chrome 90+, Firefox 88+, Safari 14+
4. Test incognito mode

### Service Worker Issues
1. DevTools → Application → Service Workers → Unregister → Reload
2. Clear cache: Application → Cache Storage → Delete all
3. Force update:
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});
```

### IndexedDB Not Working
1. Check storage enabled (not private browsing)
2. Inspect: DevTools → Application → IndexedDB
3. Clear and recreate database

## PWA Issues

### Install Prompt Not Showing
Requirements: HTTPS/localhost, valid manifest.json, service worker
Manual: Chrome → Menu → Install App; Safari → Share → Add to Home Screen

### Offline Mode Not Working
1. Verify service worker active
2. Check cached: DevTools → Application → Cache Storage
3. Test offline: DevTools → Network → "Offline" → Reload

## SDK Issues

### Invalid Seed Phrase
Verify 12/24 words from BIP39 wordlist, check typos/order, remove extra spaces

### Network Mismatch
Check network in Settings matches arkd server network (don't mix testnet/mainnet)

### Insufficient VTXOs
Wait for round settlement, check VTXO expiration, ensure boarding confirmed

## Debugging

### Enable Logging
DevTools (F12) → Console → Check errors (red) and warnings (yellow)

### Inspect State
DevTools → Application → Storage, IndexedDB, Service Workers, Cache

### Network Analysis
DevTools → Network → Filter XHR/WS → Check arkd API calls and status codes

## Getting Help

### Before Reporting
Check console errors, verify Node.js/pnpm versions, test different browser

### Report Issue
Include: Browser/OS, Node.js version, error message, steps to reproduce, screenshots

### Resources
- GitHub: https://github.com/arkade-os/wallet/issues
- Docs: https://ark.arkade.dev
- Community: Discord/Telegram
