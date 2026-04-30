# BlueWallet — Troubleshooting

Common issues for developers and Arkadian agents debugging BlueWallet.

## Build Issues

### iOS: Pod install fails / framework not found

```
fatal error: 'X' file not found
ld: framework not found Y
```

**Fix:**
```bash
npm run clean:ios    # removes node_modules + Pods, reinstalls + pod update + Metro reset
```

If still failing:
```bash
cd ios
rm -rf Pods Podfile.lock
pod deintegrate
pod install --repo-update
cd ..
```

### iOS: Apple Silicon simulator crashes immediately

Cause: Some native modules need Rosetta on Apple Silicon Macs.

**Fix:** In Xcode → Product → Destination → Show Both → pick a simulator labeled "Rosetta".

### Android: Gradle daemon hangs / memory error

```
Daemon will be stopped at the end of the build
OutOfMemoryError: Java heap space
```

**Fix:**
```bash
npm run android:clean   # gradle clean + .cxx wipe
# then
cd android
./gradlew --stop
./gradlew clean
```

Increase heap in `android/gradle.properties`:
```
org.gradle.jvmargs=-Xmx4096m
```

### Android: react-native-camera-kit-no-google build error

The `postinstall` script removes its `android/build` dir on every install — if it persists:
```bash
rm -rf node_modules/react-native-camera-kit-no-google/android/build
npm run android
```

### Metro bundler: "Module not found" after pulling new deps

```bash
npm run cleanstart   # full clean + reset-cache
```

### Patch-package failures

If `npm install` fails with patch errors:
```
ERROR Failed to apply patch for package X
```

Check `patches/X+VERSION.patch` against the new package version. You may need to:
1. Regenerate the patch: edit `node_modules/X/`, then `npx patch-package X`
2. Update or delete the obsolete patch

## Runtime Issues

### App crashes on launch with Realm error

Possible cause: schema version mismatch after upgrading the Ark wallet.

**Fix:**
- Wipe app data on the device (Android: Settings → Apps → BlueWallet → Storage → Clear)
- Or uninstall + reinstall

For dev:
```bash
npm run android:uninstall
npm run android
```

### "Cannot decrypt wallet" after restart

Cause: Keychain entry lost (e.g., after device restore) or biometric prompt cancelled.

**Fix:**
- Re-enter master password (if encryption enabled)
- Restore from BIP39 mnemonic if Keychain is gone

### Lightning Ark wallet shows zero balance

Possible causes:
1. Network unreachable: check `arkade.computer` and `api.ark.boltz.exchange` connectivity
2. Realm not opened: check device logs for `getArkadeRealm` errors
3. `_taskNamespace` mismatch: the wallet metadata persisted in AsyncStorage doesn't match the Realm DB

**Diagnostics:**
```bash
adb logcat | grep "\[ARK\]"
```

Look for:
- `Wallet bootstrapping...` lines (wallet load lifecycle)
- `swap-queue` reconciliation messages
- HTTP errors to `arkade.computer` or `api.ark.boltz.exchange`

### Boltz swap stuck pending

Causes:
- Network drop mid-swap
- Boltz API returned a non-final state but timer stopped polling

**Reconciliation runs automatically on:**
- App foreground
- Background fetch (if registered)
- Periodic polling (`startPolling`)

**Manual reconciliation**: re-open the wallet (forces `reconcileSwapTasks(_taskNamespace)`).

If the swap is **truly stuck**:
1. Check Boltz API status: `https://api.ark.boltz.exchange/health` (or status endpoint)
2. Inspect the swap row in Realm via Realm Studio (export the Realm file from the app's data dir)
3. If the swap is past timeout: the SDK should refund automatically; if not, file an issue

### Lightning amount shows "Lightning unavailable"

Cause: Boltz limits not yet fetched (`_limitMin === 0 || _limitMax === 0`).

**Fix:** Wait for the wallet to finish bootstrapping; check that `https://api.ark.boltz.exchange` is reachable. The wallet falls back to Ark-only when limits aren't loaded.

### "Wallet exists" leak (historical)

> Older versions used `sha256(secret)` as the Realm filename / Keychain service. This let an attacker who guessed your mnemonic verify whether the corresponding wallet existed on the device. **Fixed**: current versions use a random per-wallet `_taskNamespace`.

If you see legacy wallets persisting `_taskNamespace = ''` (empty), they will lazily generate a new namespace on first `getNamespace()` call. Old data may need migration — see git history of `lightning-ark-wallet.ts`.

## Test Failures

### `npm test` fails on lint

Usually:
- New file has inline styles → extract into `StyleSheet.create`
- Localization key removed but still referenced → run `node scripts/find-unused-loc.js`
- TypeScript error → run `npm run tslint` for clearer output

### Integration tests fail with mnemonic env errors

```
HD_MNEMONIC must be set
```

**Fix:** export the env var before running:
```bash
export HD_MNEMONIC="abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
```

### Detox: "Cannot connect to debug bridge"

**Fix:**
- Ensure emulator is running: `adb devices`
- For physical device: `adb reverse tcp:8081 tcp:8081`
- Or just: `npm run adb`

### Detox: timing out on launch

Bump timeout in `.detoxrc.json` config or pass `-d 200000` flag (already set in default scripts).

## Network / Connectivity

### Default endpoints unreachable

The Ark wallet uses these defaults:

| Endpoint | Default URL |
|----------|-------------|
| Ark server | `https://arkade.computer` |
| Delegator | `https://delegate.arkade.money` |
| Boltz API | `https://api.ark.boltz.exchange` |
| Ark server pubkey | `022b74c2011af089c849383ee527c72325de52df6a788428b68d49e9174053aaba` |

Probe from a dev machine:
```bash
curl -I https://arkade.computer
curl -I https://delegate.arkade.money
curl -I https://api.ark.boltz.exchange
```

If any return 5xx / time out, that's the issue.

### Custom Ark server connectivity

If using a custom server:
- TLS cert must be valid (no self-signed)
- Pubkey override must match the server's actual pubkey
- The delegator URL is independent — can be on any host

### Electrum connectivity (non-Ark wallets)

BlueWallet uses `rn-electrum-client` (BlueWallet fork). Servers are configured in app settings. If on-chain balance is wrong:
- Try a different Electrum server
- Force a refresh from the wallet details screen

## Localization

### "Unused loc key" lint failure

```
Found unused loc keys: x.y.z
```

**Fix:** Either remove the key from `loc/en.json`, or use it somewhere in the code. You can often find the original usage with:
```bash
git log -p loc/en.json | grep "x.y.z"
```

### Translation missing for a string

BlueWallet uses Transifex. Translations are pulled before release. To regenerate:
- Run the Transifex CLI (maintainer-only)
- Or wait for the auto-PR Transifex creates

## Where to Look First

| Problem | Check |
|---------|-------|
| Build fails | `npm run clean*` + reinstall |
| Crash on launch | Wipe app data, check logs |
| Ark balance wrong | `[ARK]` logs in `adb logcat` |
| Boltz swap stuck | Reconciliation logs in `swap-queue.ts` and SDK |
| Test failures | Lint first, then unit, then integration |
| Network issues | Probe defaults with `curl -I` |

## Reporting Bugs

| Channel | When |
|---------|------|
| GitHub Issues | Most bugs |
| Email `bluewallet@bluewallet.io` | Critical / security |
| Telegram contributors group | Active dev discussion (request access by email) |

For Ark-specific issues, also CC the Arkade SDK maintainers — the bug may live in `@arkade-os/sdk` or `@arkade-os/boltz-swap` rather than BlueWallet itself.
