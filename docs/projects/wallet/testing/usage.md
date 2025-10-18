# Arkade Wallet Usage Guide

## Accessing the Wallet

### Web Version
- Visit hosted URL in modern browser (Chrome, Firefox, Safari, Edge)
- Works on desktop and mobile browsers

### Progressive Web App (PWA)
- Open wallet in browser, click install prompt
- Install to home screen (mobile) or desktop
- Works offline after installation

## First-Time Setup

### Create New Wallet
1. Select "Create New Wallet"
2. System generates 12-word seed phrase
3. Write down seed phrase in exact order (store offline securely)
4. Confirm seed phrase and set optional password

### Restore Wallet
1. Select "Restore Wallet"
2. Enter 12-word seed phrase
3. Set password if desired

### Seed Security
- Write on paper, never store digitally
- Keep multiple copies in secure locations
- Never share with anyone
- Losing seed = losing funds permanently

## Basic Operations

### Receive Bitcoin
**Boarding (On-chain)**: Navigate to Receive → "Boarding Address" → Show QR/copy address
**Off-chain (VTXO)**: Navigate to Receive → "Off-chain Address" → Instant after round

### Send Bitcoin
1. Click "Send", enter recipient address (or scan QR)
2. Enter amount in BTC or sats
3. Review and confirm
4. Transaction submitted to next round

### Check Balance
- Main screen shows total balance (confirmed, pending, locked)
- VTXOs display with expiration times

### Transaction History
- Navigate to History/Transactions
- Filter by type: sent, received, boarding
- Click for details

## Lightning Swaps

### Swap to Lightning
Apps → Lightning → "Swap to Lightning" → Enter amount and invoice → Confirm

### Swap from Lightning
Apps → Lightning → "Swap from Lightning" → Enter amount → Pay generated invoice

## Settings

### Change Ark Server
Settings → "Server Configuration" → Enter URL: `http://your-server:7070` → Save

### Toggle Network
Settings → "Network" → Choose: Testnet, Signet, or Mainnet

### Theme
Settings → "Appearance" → Choose: Light, Dark, or System

### Other Options
- Display units (BTC/sats)
- Currency conversion
- Language preferences
- Backup wallet data

## Security Best Practices

### Seed Protection
- Never share seed phrase
- No screenshots, no cloud storage
- Use offline storage (paper, metal)
- Keep multiple secure backups

### Password Management
- Use strong, unique password
- Don't reuse from other services
- Password protects local storage only

### General Security
- Verify wallet URL before entering seed
- Keep browser updated
- Avoid public WiFi
- Enable device lock screen
- Beware of phishing
- Verify recipient addresses carefully
- Start with small test transactions
