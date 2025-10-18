# Authentication: Schnorr Signature-Based Authentication

## Overview

arkade-escrow implements a passwordless authentication system using Schnorr signatures over the secp256k1 curve. This approach eliminates the need for password storage, management, and associated vulnerabilities while providing cryptographic proof of identity ownership.

The authentication flow follows a challenge-response pattern where users prove ownership of their Bitcoin public keys by signing server-generated challenges. Successful authentication results in a JWT token for subsequent API requests.

## Key Concepts

### Public Key as Identity

Each user is identified solely by their **x-only public key** (32-byte Schnorr public key):

```typescript
@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "text" })
  publicKey!: string;  // 64-character hex string (32 bytes)
}
```

There is no username, email, or password. The public key is the user's permanent identifier in the system.

### Challenge-Response Protocol

Authentication consists of two steps:

1. **Challenge Request**: Server generates a unique challenge for the public key
2. **Signature Verification**: User signs the challenge with their private key; server verifies the signature

This proves the user controls the private key corresponding to their public key without ever transmitting the private key.

## Authentication Flow

### Step 1: Request Challenge

**Endpoint:** `POST /api/v1/auth/signup/challenge`

**Request:**
```json
{
  "publicKey": "9a99c66a064f18f93377ff5c194506d43925da02aad7897ecb56ce5e747b08e3"
}
```

**Process:**

The `AuthService.createSignupChallenge()` method:

1. **Lookup or create user** with the provided public key
2. **Generate challenge payload** with nonce and origin:
   ```typescript
   const { id, payload, hashHex } = createSignupChallenge(origin);
   ```

3. **Store challenge in database**:
   ```typescript
   user.pendingChallenge = JSON.stringify(payload);
   user.challengeId = id;
   user.challengeExpiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS);
   await this.users.save(user);
   ```

4. **Return challenge to client**:
   ```json
   {
     "challenge": {
       "scope": "signup",
       "nonce": "a1b2c3d4e5f6...",
       "issuedAt": "2025-10-16T12:34:56.789Z",
       "origin": "https://api.example.com"
     },
     "challengeId": "uuid-v4-challenge-id",
     "hashToSignHex": "64-character-hex-hash",
     "expiresAt": "2025-10-16T12:39:56.789Z"
   }
   ```

**Challenge Structure:**

```typescript
export type ChallengePayload = {
  scope: "signup";
  nonce: string;        // Random hex string
  issuedAt: string;     // ISO timestamp
  origin: string;       // API origin for CORS protection
};
```

The `hashToSignHex` is computed by:

```typescript
function hashSignupPayload(payload: ChallengePayload): string {
  const message = JSON.stringify(payload);
  return hex.encode(sha256(message));
}
```

**Challenge Expiration:** 5 minutes (300,000 milliseconds)

### Step 2: Verify Signature

**Endpoint:** `POST /api/v1/auth/signup/verify`

**Request:**
```json
{
  "publicKey": "9a99c66a064f18f93377ff5c194506d43925da02aad7897ecb56ce5e747b08e3",
  "signature": "128-character-hex-schnorr-signature",
  "challengeId": "uuid-v4-challenge-id"
}
```

**Process:**

The `AuthService.verifySignup()` method:

1. **Retrieve user and challenge**:
   ```typescript
   const user = await this.users.findOne({ where: { publicKey } });
   if (!user || !user.pendingChallenge || !user.challengeId) {
     throw new UnauthorizedException("No pending challenge");
   }
   ```

2. **Validate challenge ID and expiration**:
   ```typescript
   if (user.challengeId !== challengeId) {
     throw new UnauthorizedException("Challenge mismatch");
   }
   if (!user.challengeExpiresAt || user.challengeExpiresAt < new Date()) {
     throw new UnauthorizedException("Challenge expired");
   }
   ```

3. **Parse and validate challenge payload**:
   ```typescript
   const payload = JSON.parse(user.pendingChallenge);
   if (payload?.origin !== origin || payload?.scope !== "signup") {
     throw new UnauthorizedException("Invalid challenge scope or origin");
   }
   ```

4. **Verify Schnorr signature**:
   ```typescript
   const hashHex = hashSignupPayload(payload);
   const ok = schnorr.verify(
     hexToBytes(signatureHex),
     hexToBytes(hashHex),
     hexToBytes(publicKey),
   );
   if (!ok) {
     throw new UnauthorizedException("Invalid signature");
   }
   ```

5. **Clear challenge and update login timestamp**:
   ```typescript
   user.pendingChallenge = null;
   user.challengeId = null;
   user.challengeExpiresAt = null;
   user.lastLoginAt = new Date();
   await this.users.save(user);
   ```

6. **Generate JWT token**:
   ```typescript
   const accessToken = await this.jwt.signAsync({
     sub: user.id,
   });
   ```

7. **Return authentication response**:
   ```json
   {
     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "expiresAt": 0,
     "userId": "8402072f-3160-44a8-aba6-32dc7540c1cf",
     "publicKey": "9a99c66a064f18f93377ff5c194506d43925da02aad7897ecb56ce5e747b08e3"
   }
   ```

**Schnorr Signature Verification:**

Uses `@noble/secp256k1` library:

```typescript
import { schnorr } from "@noble/secp256k1";

schnorr.verify(signature, messageHash, publicKey)
```

This verifies that `signature` is a valid Schnorr signature for `messageHash` under `publicKey`.

## JWT Token Generation and Validation

### Token Payload

JWTs contain minimal information:

```typescript
{
  sub: user.id,           // Subject: internal UUID
  iat: 1234567890,        // Issued At: automatic
  exp: 1234567890 + TTL   // Expiration: automatic
}
```

The public key is **not** stored in the JWT. The `sub` claim references the user's database ID, and the public key is retrieved from the database when needed.

### Token Configuration

JWT module configuration (in `AuthModule`):

```typescript
JwtModule.register({
  secret: process.env.JWT_SECRET || "default-secret-change-in-production",
  signOptions: {
    expiresIn: '7d',  // 7-day token lifetime
  },
})
```

**Security note:** The default secret must be replaced with a strong random value in production via the `JWT_SECRET` environment variable.

## AuthGuard

The `AuthGuard` protects routes requiring authentication:

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;

    // Extract Bearer token
    if (!header) throw new UnauthorizedException("Missing Authentication header");
    const [scheme, token] = header.split(" ");
    if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
      throw new UnauthorizedException("Invalid Authentication format");
    }

    // Verify JWT
    let payload: { sub: string } | null = null;
    try {
      payload = this.jwt.verify<{ sub: string }>(token);
    } catch (e: unknown) {
      throw new UnauthorizedException("Invalid token");
    }

    // Fetch user from database
    const user = await this.users.findOne({ where: { id: payload?.sub } });

    // Reject if user has pending challenge (incomplete auth)
    if (!user || user.pendingChallenge) {
      throw new UnauthorizedException("User has pending challenge");
    }

    // Attach user to request
    req.user = { userId: user.id, publicKey: user.publicKey };
    return true;
  }
}
```

**Key behaviors:**

1. Extracts `Bearer` token from `Authorization` header
2. Verifies JWT signature and expiration
3. Fetches user from database using `sub` claim
4. Rejects authentication if user has a pending challenge (prevents using old tokens during re-authentication)
5. Attaches user information to `req.user` for downstream access

### Usage in Controllers

```typescript
@Post("")
@UseGuards(AuthGuard)
@ApiBearerAuth()
async create(
  @Body() dto: CreateEscrowRequestInDto,
  @UserFromJwt() user: User,
): Promise<ApiEnvelope<CreateEscrowRequestOutDto>> {
  // user is automatically populated by AuthGuard
  const data = await this.requestsService.create(dto, user.publicKey);
  return envelope(data);
}
```

## @UserFromJwt() Decorator

Custom parameter decorator for extracting authenticated user:

```typescript
export const UserFromJwt = createParamDecorator(
  (
    key: keyof AuthUser | undefined,
    ctx: ExecutionContext,
  ): string | AuthUser | undefined => {
    const req: Request = ctx.switchToHttp().getRequest();
    return key ? req.user?.[key] : req.user;
  },
);
```

**Usage examples:**

```typescript
// Get full user object
@UserFromJwt() user: User

// Get specific field
@UserFromJwt('publicKey') publicKey: string
@UserFromJwt('userId') userId: string
```

The decorator reads from `req.user`, which is populated by `AuthGuard`.

## No Password Storage

The system **never** stores, hashes, or validates passwords:

- No password fields in database
- No bcrypt/argon2 dependencies
- No password reset flows
- No "forgot password" endpoints
- No password complexity requirements

Security relies entirely on:
1. Private key custody (user's responsibility)
2. Signature verification (cryptographic proof)
3. JWT token security (server's responsibility)

## Session Management

### Session Creation

Sessions are created upon successful signature verification when the JWT is issued.

### Session Expiration

JWT tokens expire after 7 days. There is no server-side session store; expiration is enforced by JWT validation.

### Session Invalidation (Logout)

**Current status:** Not implemented

```typescript
@Post("/signout")
@UseGuards(AuthGuard)
async signout() {
  throw new InternalServerErrorException("Not implemented");
}
```

**Planned approach:** Implement a JWT blacklist or short-lived tokens with refresh token rotation.

### Challenge State

Users can have at most one pending challenge at a time:

```typescript
user.pendingChallenge = JSON.stringify(payload);  // Overwrites previous
```

Completing authentication (verifying signature) clears the challenge:

```typescript
user.pendingChallenge = null;
user.challengeId = null;
user.challengeExpiresAt = null;
```

## Security Considerations

### Replay Attack Prevention

**Challenge nonce:** Each challenge contains a unique random nonce, preventing signature reuse.

**Challenge expiration:** Challenges expire after 5 minutes, limiting the time window for replay attacks.

**One-time use:** Completing authentication clears the challenge, preventing the same challenge from being used twice.

### Origin Validation

The challenge includes the `origin` field (from HTTP `Origin` header or config):

```typescript
const effectiveOrigin = origin ?? this.configService.get("AUTH_CHALLENGE_ORIGIN", "https://api.local");
```

During verification, the origin must match:

```typescript
if (payload?.origin !== origin) {
  throw new UnauthorizedException("Invalid challenge scope or origin");
}
```

This provides CORS-like protection against cross-origin attacks.

### Timing Attacks

The signature verification uses constant-time comparison from `@noble/secp256k1`, preventing timing-based attacks to extract private key information.

### JWT Secret Management

**Development:** Uses default secret (insecure)

**Production:** Must set `JWT_SECRET` environment variable to a cryptographically random value (minimum 256 bits).

```bash
export JWT_SECRET=$(openssl rand -hex 32)
```

### Public Key Validation

Public keys are validated during challenge creation:

```typescript
function validateOptions(options: Options): void {
  if (key.length !== 32) {
    throw new Error(`Invalid public key length: expected 32, got ${key.length}`);
  }
}
```

### HTTPS Requirement

While not enforced in development, **production deployments must use HTTPS** to prevent:
- JWT token interception
- Challenge/signature interception
- Man-in-the-middle attacks

## Client Implementation Example

Using the `scripts/signup.js` utility:

```javascript
// 1. Generate keypair
const privateKey = schnorr.utils.randomPrivateKey();
const publicKey = schnorr.getPublicKey(privateKey);

// 2. Request challenge
const { hashToSignHex, challengeId } = await fetch('/api/v1/auth/signup/challenge', {
  method: 'POST',
  body: JSON.stringify({ publicKey: hex.encode(publicKey) }),
}).then(r => r.json());

// 3. Sign challenge
const signature = await schnorr.sign(hashToSignHex, privateKey);

// 4. Verify signature
const { accessToken, userId } = await fetch('/api/v1/auth/signup/verify', {
  method: 'POST',
  body: JSON.stringify({
    publicKey: hex.encode(publicKey),
    signature: hex.encode(signature),
    challengeId,
  }),
}).then(r => r.json());

// 5. Use JWT for authenticated requests
fetch('/api/v1/escrows/requests', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ /* request body */ }),
});
```

## Limitations and Future Improvements

### Current Limitations

1. **No logout:** JWT invalidation not implemented
2. **Long token lifetime:** 7-day tokens increase exposure if compromised
3. **No refresh tokens:** Users must re-authenticate every 7 days
4. **No rate limiting:** Challenge endpoint susceptible to abuse
5. **No account recovery:** Losing private key means permanent loss of account

### Future Improvements

1. **Implement JWT blacklist** for logout functionality
2. **Shorter access tokens + refresh tokens** (e.g., 15-minute access, 7-day refresh)
3. **Rate limiting** on challenge endpoint (e.g., 5 challenges per IP per hour)
4. **Multi-device support** with session management UI
5. **Hardware wallet integration** (Ledger, Trezor) for signing challenges
6. **BIP322 signature support** for Bitcoin wallet compatibility
7. **Account recovery mechanisms** (e.g., social recovery, time-locked backup keys)

## Comparison to Traditional Authentication

| Feature | Traditional (Password) | Schnorr (arkade-escrow) |
|---------|------------------------|--------------------------|
| Storage | Hashed password | Public key only |
| Transmission | Password sent to server | Signature sent to server |
| Compromise | Database leak exposes passwords | Database leak exposes nothing sensitive |
| Phishing | User types password on fake site | User signs challenge; signature only valid once |
| Reset | "Forgot password" flow required | No reset possible (private key custody) |
| Complexity | Password rules, rotation | No rules; key is 256 bits of entropy |
| 2FA | Optional add-on | Built-in (possession of private key) |

## Integration with Escrow Workflow

Public keys serve dual purposes:

1. **Authentication identity** (via challenge-response)
2. **Contract participant identity** (via multisig scripts)

This eliminates the need for separate "link public key to account" steps. A user's authentication public key is automatically their contract participation key.

Example: When creating an escrow contract, the sender's public key from authentication is used directly in the VEC script:

```typescript
const escrowScript = new VEscrow.Script({
  sender: hex.decode(user.publicKey),  // From AuthGuard
  receiver: hex.decode(receiverPubkey),
  arbitrator: hex.decode(arbitratorPubkey),
  server: hex.decode(serverPubkey),
  unilateralDelay,
});
```

This design ensures cryptographic continuity between authentication and contract execution.
