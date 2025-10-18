# Configuration: ARK Faucet

## Environment Variables

### Core Configuration

**ARK_FAUCET_DATADIR**
- **Purpose**: Directory for wallet storage and persistent data
- **Default**: `~/.arkfaucet` (user home directory)
- **Example**: `/var/lib/arkfaucet` or `/home/user/.arkfaucet`
- **Notes**: Must be writable by the service process. Contains wallet keys and VTXO data.

**ARK_FAUCET_PORT**
- **Purpose**: HTTP server listening port
- **Default**: `9999`
- **Example**: `8080`, `3000`
- **Notes**: Ensure port is not in use. Docker deployments should map this port.

**ARK_FAUCET_SERVER_URL**
- **Purpose**: URL of the arkd server to connect to
- **Default**: `http://localhost:7070`
- **Example**: `https://ark.example.com:443`, `http://192.168.1.100:7070`
- **Notes**: Must match the protocol (http/https) and port of running arkd instance.

**ARK_FAUCET_PASSWORD**
- **Purpose**: Wallet encryption password
- **Default**: None (required)
- **Example**: `MyS3cur3P@ssw0rd`
- **Notes**: REQUIRED. Used to encrypt/decrypt wallet keys. Cannot be recovered if lost.

**ARK_FAUCET_IS_COVENANT**
- **Purpose**: Enable covenant mode for Liquid network
- **Default**: `false` (Bitcoin/covenantless mode)
- **Example**: `true` for Liquid, `false` for Bitcoin
- **Notes**: Must match arkd server mode. Mismatch causes transaction failures.

### Authentication Configuration

**ARK_FAUCET_AUTH_USER**
- **Purpose**: Username for protected endpoints
- **Default**: `admin`
- **Example**: `faucet_admin`, `operator`
- **Notes**: Used with basic authentication. Change default for security.

**ARK_FAUCET_AUTH_PASS**
- **Purpose**: Password for protected endpoints
- **Default**: `admin`
- **Example**: `Str0ng_P@ssword_123`
- **Notes**: Used with basic authentication. MUST change default in production.

### Initialization Configuration

**ARK_FAUCET_NOTES**
- **Purpose**: Comma-separated notes to initialize wallet balance
- **Default**: None (optional)
- **Example**: `note1_base64...,note2_base64...,note3_base64...`
- **Notes**: Notes are redeemed on first startup. Subsequent restarts ignore this variable.

### Refill Configuration

**ARK_FAUCET_SERVER_DATADIR**
- **Purpose**: Path to arkd data directory for macaroons and TLS certificates
- **Default**: `~/.arkd` (user home directory)
- **Example**: `/var/lib/arkd`, `/home/user/.arkd`
- **Notes**: Required for `/refill` endpoint. Must contain `macaroons/admin.macaroon`.

**ARK_FAUCET_EXPLORER_URL**
- **Purpose**: Bitcoin/Liquid explorer URL for onchain operations
- **Default**: None (optional)
- **Example**: `https://blockstream.info/testnet/api`, `http://localhost:3000`
- **Notes**: Used by SDK for onchain address validation and transaction broadcast.

## Configuration Modes

### Development Mode (Local)

**Use Case**: Running on local machine with default settings

```bash
export ARK_FAUCET_DATADIR=~/.arkfaucet
export ARK_FAUCET_PORT=9999
export ARK_FAUCET_SERVER_URL=http://localhost:7070
export ARK_FAUCET_PASSWORD=dev_password
export ARK_FAUCET_IS_COVENANT=false
export ARK_FAUCET_AUTH_USER=admin
export ARK_FAUCET_AUTH_PASS=admin
export ARK_FAUCET_SERVER_DATADIR=~/.arkd
```

**Characteristics**:
- Simple defaults
- Local filesystem paths
- Insecure credentials acceptable
- Easy debugging

### Production Mode (Docker)

**Use Case**: Deployed service with security considerations

```bash
export ARK_FAUCET_DATADIR=/data/faucet
export ARK_FAUCET_PORT=9999
export ARK_FAUCET_SERVER_URL=https://arkd.internal:7070
export ARK_FAUCET_PASSWORD=${SECURE_WALLET_PASSWORD}
export ARK_FAUCET_IS_COVENANT=false
export ARK_FAUCET_AUTH_USER=faucet_operator
export ARK_FAUCET_AUTH_PASS=${SECURE_ADMIN_PASSWORD}
export ARK_FAUCET_SERVER_DATADIR=/data/arkd
export ARK_FAUCET_EXPLORER_URL=https://blockstream.info/api
```

**Characteristics**:
- Volume-mounted data directories
- Strong passwords from secrets management
- Custom credentials
- HTTPS connections

### Testnet Mode (Public Faucet)

**Use Case**: Public-facing testnet faucet service

```bash
export ARK_FAUCET_DATADIR=/var/lib/arkfaucet
export ARK_FAUCET_PORT=80
export ARK_FAUCET_SERVER_URL=https://testnet-arkd.example.com:443
export ARK_FAUCET_PASSWORD=${WALLET_PASSWORD}
export ARK_FAUCET_IS_COVENANT=false
export ARK_FAUCET_AUTH_USER=${ADMIN_USER}
export ARK_FAUCET_AUTH_PASS=${ADMIN_PASS}
export ARK_FAUCET_SERVER_DATADIR=/var/lib/arkd
export ARK_FAUCET_EXPLORER_URL=https://blockstream.info/testnet/api
export ARK_FAUCET_NOTES=${INITIAL_NOTES}
```

**Characteristics**:
- Standard HTTP port
- Public access to faucet endpoint
- Protected admin endpoints
- Initial balance via notes
- External explorer for testnet

## Default Values Reference

| Variable | Default | Required |
|----------|---------|----------|
| ARK_FAUCET_DATADIR | `~/.arkfaucet` | No |
| ARK_FAUCET_PORT | `9999` | No |
| ARK_FAUCET_SERVER_URL | `http://localhost:7070` | No |
| ARK_FAUCET_PASSWORD | None | **Yes** |
| ARK_FAUCET_IS_COVENANT | `false` | No |
| ARK_FAUCET_AUTH_USER | `admin` | No |
| ARK_FAUCET_AUTH_PASS | `admin` | No |
| ARK_FAUCET_NOTES | None | No |
| ARK_FAUCET_SERVER_DATADIR | `~/.arkd` | No |
| ARK_FAUCET_EXPLORER_URL | None | No |

## Security Considerations

### Critical Security Settings

1. **Change Default Admin Credentials**: Never use `admin:admin` in production
2. **Use Strong Wallet Password**: Protects wallet keys from unauthorized access
3. **Protect arkd Data Directory**: Limit filesystem permissions to prevent macaroon theft
4. **Use HTTPS**: Encrypt credentials and macaroons in transit
5. **Secure Environment Variables**: Use secrets management, never commit to version control

### Recommended Security Practices

**File Permissions**:
```bash
chmod 700 $ARK_FAUCET_DATADIR
chmod 700 $ARK_FAUCET_SERVER_DATADIR
chmod 600 $ARK_FAUCET_SERVER_DATADIR/macaroons/admin.macaroon
```

**Password Strength**:
- Minimum 16 characters
- Mix of uppercase, lowercase, numbers, symbols
- Unique passwords for wallet and admin auth
- Store in secure secrets manager (HashiCorp Vault, AWS Secrets Manager)

**Network Security**:
- Run behind reverse proxy with rate limiting
- Use HTTPS for all external connections
- Restrict arkd server URL to internal network
- Firewall rules to limit access

## Docker Configuration Example

### docker-compose.yml

```yaml
version: '3.8'

services:
  arkfaucet:
    image: arkfaucet:latest
    ports:
      - "9999:9999"
    environment:
      ARK_FAUCET_DATADIR: /data/faucet
      ARK_FAUCET_PORT: 9999
      ARK_FAUCET_SERVER_URL: http://arkd:7070
      ARK_FAUCET_PASSWORD_FILE: /run/secrets/wallet_password
      ARK_FAUCET_AUTH_USER: operator
      ARK_FAUCET_AUTH_PASS_FILE: /run/secrets/admin_password
      ARK_FAUCET_SERVER_DATADIR: /data/arkd
    volumes:
      - faucet_data:/data/faucet
      - arkd_data:/data/arkd:ro
    secrets:
      - wallet_password
      - admin_password
    depends_on:
      - arkd

volumes:
  faucet_data:
  arkd_data:

secrets:
  wallet_password:
    file: ./secrets/wallet_password.txt
  admin_password:
    file: ./secrets/admin_password.txt
```

### Volume Mounts

- **faucet_data**: Persistent wallet storage
- **arkd_data**: Read-only access to arkd directory for macaroons

### Secrets Management

Use Docker secrets or mounted files for sensitive values rather than environment variables directly.

## Filesystem Requirements

### Directory Structure

```
ARK_FAUCET_DATADIR/
├── config.json          # SDK wallet configuration
└── store/               # KV store for VTXOs and state
    └── ...

ARK_FAUCET_SERVER_DATADIR/
├── macaroons/
│   └── admin.macaroon   # Required for refill endpoint
└── tls/
    └── cert.pem         # Required for HTTPS connections
```

### Disk Space

- Minimal: <10MB for wallet and configuration
- Grows with number of VTXOs in wallet
- No transaction history stored

### Permissions

Service process must have:
- Read/write access to `ARK_FAUCET_DATADIR`
- Read-only access to `ARK_FAUCET_SERVER_DATADIR` (for refill feature)
