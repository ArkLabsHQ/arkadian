# Project Overview: arkade-escrow

## What is arkade-escrow?

arkade-escrow is a proof-of-concept three-party escrow system built on top of the [Arkade protocol](https://arkadeos.com/). It enables trustless escrow transactions using Bitcoin's security model combined with Ark's off-chain efficiency, allowing parties to safely exchange value with arbitration support without relying on centralized custodians.

The system consists of a NestJS-based REST API backend (with plans for a companion web application) that facilitates the creation, management, and settlement of escrow contracts between senders and receivers, with an arbitrator available to resolve disputes.

## Key Features

### Virtual Escrow Contracts (VEC)

At the core of arkade-escrow is the Virtual Escrow Contract, a sophisticated Bitcoin script that provides six distinct spending paths:

**Collaborative Paths (require server signature):**
- **Direct Settlement**: Sender + Receiver + Server (happy path, no dispute)
- **Release Funds**: Receiver + Arbitrator + Server (arbitrator sides with receiver)
- **Return Funds**: Sender + Arbitrator + Server (arbitrator sides with sender)

**Unilateral Paths (with CSV timelock, no server required):**
- **Unilateral Direct**: Sender + Receiver (after timelock)
- **Unilateral Release**: Receiver + Arbitrator (after timelock)
- **Unilateral Refund**: Sender + Arbitrator (after timelock)

This design ensures that funds can always be recovered even if one party becomes unresponsive or the server goes offline.

### Schnorr Signature Authentication

The system uses a passwordless authentication system based on Schnorr signatures:
- Users authenticate using their Bitcoin public keys
- Challenge-response protocol prevents replay attacks
- Public key serves as the user's identity
- No password storage or management required
- JWT tokens for session management

### Comprehensive REST API

Built with NestJS, the API provides:
- OpenAPI/Swagger documentation available at `/api/v1/docs`
- Full CRUD operations for escrow requests and contracts
- Public orderbook for discovering available escrow requests
- Arbitration workflow support
- Contract execution with multi-party signature collection
- Health monitoring endpoint

## Use Cases

### E-commerce Transactions
Buyers and sellers can use escrow contracts to ensure goods are delivered before payment is released. If disputes arise, an arbitrator can review evidence and make a binding decision.

### Peer-to-Peer Trading
Individuals trading Bitcoin for goods, services, or other assets can protect themselves from fraud by using an escrow contract with a mutually trusted arbitrator.

### Freelance and Service Agreements
Clients can fund escrow contracts that release payment when deliverables are completed. Freelancers are protected from non-payment, while clients are protected from non-delivery.

### Cross-Border Settlements
International transactions benefit from the trustless nature of Bitcoin combined with Ark's instant settlement capabilities, with arbitration available for dispute resolution.

## Technology Stack

### Backend Framework
- **NestJS**: Opinionated TypeScript framework providing dependency injection, modular architecture, and excellent tooling for rapid development
- **TypeScript**: Type-safe development with full IDE support

### Blockchain Integration
- **@arkade-os/sdk (v0.3.1-alpha.3)**: Official Arkade SDK for interacting with Ark servers, building off-chain transactions, and managing VTXOs
- **@scure/btc-signer**: Low-level Bitcoin transaction construction and signing
- **Noble cryptography**: Pure TypeScript implementations of cryptographic primitives (secp256k1, SHA-256, hashing)

### Database
- **SQLite**: Lightweight embedded database for the proof-of-concept (PostgreSQL support via TypeORM is straightforward for production)
- **TypeORM**: Object-relational mapping with excellent NestJS integration, support for multiple database backends

### Authentication & Validation
- **@nestjs/jwt**: JWT token generation and verification
- **class-validator**: Decorator-based DTO validation
- **class-transformer**: Object transformation and serialization

### API Documentation
- **@nestjs/swagger**: Automatic OpenAPI specification generation from TypeScript decorators
- **Swagger UI**: Interactive API documentation

### Development Tooling
- **Biome.js**: Fast linter and formatter (replaces ESLint + Prettier)
- **Jest**: Testing framework
- **Docker**: Containerized development environment

## Current Status

### Alpha / Proof of Concept

arkade-escrow is currently in **alpha status** as a proof-of-concept implementation. The system demonstrates the feasibility of building trustless escrow on Arkade but has several limitations:

**Implemented:**
- User authentication with Schnorr signatures
- Escrow request creation and discovery (orderbook)
- Contract creation and funding detection
- Multi-signature transaction building
- Collaborative spending paths (direct settlement, release, refund)
- Basic arbitration workflow
- REST API with Swagger documentation

**In Development:**
- Unilateral spending paths (timelock-based recovery)
- JWT invalidation for logout
- Comprehensive error handling
- Web application frontend
- Production database migration (PostgreSQL)
- Performance optimizations

**Known Issues:**
- PSBT input validation errors during transaction submission (missing taptree on input 0)
- Limited test coverage
- No production deployment configuration

### Development Workflow

The project uses Docker for development with Nigiri (Bitcoin regtest environment with Ark support). The main development command is `npm run api:dev` for hot-reload server development.

Environment variables are configured via `.env` files, with examples provided in `.env.example`.

## Architecture Philosophy

The project follows NestJS conventions:
- **Modular design**: Each domain (Auth, Users, Escrows, Ark, Admin, Health) is a separate module
- **Dependency injection**: Services are injected into controllers, promoting testability
- **Separation of concerns**: Controllers handle HTTP, Services contain business logic, Entities define data models
- **Type safety**: Full TypeScript coverage with strict validation at API boundaries

## Security Considerations

- **No custody**: Funds are always held in Bitcoin scripts, never in the API's control
- **Multi-signature requirements**: All critical operations require multiple parties to sign
- **Challenge expiration**: Authentication challenges expire after 5 minutes
- **Input validation**: All API inputs are validated using class-validator decorators
- **CORS enabled**: Cross-origin requests are supported (configure for production)

## Future Roadmap

1. Complete unilateral spending path implementation
2. Build web application frontend
3. Implement comprehensive testing (unit, integration, e2e)
4. Production database migration and optimization
5. Enhanced arbitration features (evidence submission, communication)
6. Multi-VTXO contracts for larger amounts
7. Fee management and optimization
8. Monitoring and observability
9. Security audit
10. Mainnet deployment

## Getting Started

See the main README.md for setup instructions. The key requirement is running Nigiri with Ark support:

```bash
$ nigiri start --ark
$ npm install
$ npm run api:dev
```

The API will be available at `http://localhost:3000` with Swagger documentation at `http://localhost:3000/api/v1/docs`.
