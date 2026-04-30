# BlueWallet — How to Run

Full setup for local development, including iOS, Android, and macOS targets.

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | **>= 20** (even-numbered LTS preferred) |
| npm | comes with Node 20 |
| Ruby | 3.x (for CocoaPods) — see `.ruby-version` |
| Bundler | `gem install bundler` |
| Xcode | Latest stable (for iOS / macOS Catalyst) |
| CocoaPods | Latest |
| Android Studio | Latest (for Android dev + AVD) |
| Java | JDK 17 (for Android Gradle) |
| Watchman | macOS dev convenience |
| Git LFS | Some assets via LFS |

Verify:
```bash
node --version && npm --version
ruby --version
xcodebuild -version       # macOS only
java -version
```

## Clone & Install

```bash
git clone https://github.com/BlueWallet/BlueWallet.git
cd BlueWallet
npm install
```

The `postinstall` script:
- Removes a non-Google camera-kit Android build dir
- Generates `release-notes.json` (from git log)
- Generates `current-branch.json`
- Applies all patches in `patches/` via `patch-package`

## Running on iOS / macOS

```bash
# install CocoaPods (first time / after pod changes)
npx pod-install

# start Metro bundler
npm start
```

In a second terminal:
```bash
# iOS Simulator
npx react-native run-ios

# pick a specific simulator
npx react-native run-ios --simulator="iPhone 15 Pro"
```

**For macOS (Catalyst)**:
1. Open `ios/BlueWallet.xcworkspace`
2. Select scheme `BlueWallet` → destination `My Mac (Mac Catalyst)`
3. **Run**

> **Debug on iOS Simulator (Apple Silicon)**: Choose a Rosetta-compatible simulator. In Xcode → Product → Destination → Show Both → pick a simulator labeled "Rosetta".

## Running on Android

### One-time setup
1. Install **Android Studio**
2. Open `BlueWallet/android/build.gradle` once so Studio downloads SDKs
3. **Tools → AVD Manager → Create Virtual Device** (e.g., Pixel 6 Pro, API 34)
4. Launch the AVD via the green play arrow, OR plug in a physical device with USB debugging

### Run

```bash
# start Metro
npm start

# in another terminal
npx react-native run-android
```

To re-launch app on already-installed device:
```bash
npm run android:relaunch
```

To uninstall:
```bash
npm run android:uninstall
```

For physical device port forward:
```bash
npm run adb        # adb reverse tcp:8081 tcp:8081
```

## Environment Variables (for Integration Tests)

Integration tests need real testnet mnemonics:

```bash
export HD_MNEMONIC="..."
export HD_MNEMONIC_BIP84="..."
# ... see tests/integration/ for each test's required vars
```

Most tests fail loudly with the variable name they need.

## Common Build Issues

### iOS: "fatal error: 'X' file not found"
```bash
npm run clean:ios       # nukes Pods + node_modules
npx pod-install         # reinstall
```

### Android: Gradle errors
```bash
npm run android:clean   # clean Gradle + .cxx + run android
```

### Metro bundler stuck
```bash
npm run cleanstart      # clean + start with --reset-cache
```

### Patch-package failures
After pulling new commits:
```bash
npm install             # reapplies patches
# if a patch fails, check patches/<package>+<version>.patch
```

## Native Modules (BlueWallet Forks)

BlueWallet maintains forks of several RN modules under `BlueWallet/*`:
- `react-native-blue-crypto`
- `rn-electrum-client`
- `react-native-context-menu-view`
- `react-native-handoff`
- `react-native-prompt-android`
- `react-native-secure-key-store`
- `react-native-draglist`
- `slip39-js`
- `bip47`, `bip38`, `coinselect`
- `SilentPayments`
- `react-localization`
- `rn-qr-generator`
- `react-native-default-preference`

These are pulled directly from GitHub commits in `package.json`. If you need to debug one, clone it locally and use `npm link` or the `file:` resolver.

## Building Releases

Releases are managed via **fastlane** (`fastlane/`) and GitHub Actions. The build matrix targets:
- iOS (App Store)
- Android (Google Play, GitHub APK)
- macOS (Mac Catalyst)

Local release builds:
```bash
# Android release
cd android
./gradlew assembleRelease

# iOS release
# Use Xcode: Product → Archive
```

## Debug Tools

| Tool | Use |
|------|-----|
| Flipper | RN debugging, network inspector |
| React DevTools | Component tree |
| Reactotron | State + actions log |
| Bugsnag dashboard | Production crash reports |
| BrowserStack | Cross-device QA |

## Watching Builds

```bash
# Metro logs
npm start

# Android logcat (filtered)
adb logcat | grep -E "BlueWallet|ReactNative|ARK"

# iOS device console
xcrun simctl spawn booted log stream | grep BlueWallet
```

The Ark integration logs with prefix `[ARK]` — useful for tracing wallet bootstrapping and swap reconciliation:
```bash
adb logcat | grep "\[ARK\]"
```
