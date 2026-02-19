# Project Overview: arkade-escrow

## What is arkade-escrow?

Arkade Escrow is a lightweight, browser-native escrow platform for instant, trust-minimized Bitcoin deals on Ark. It can be deployed as a **standalone web app** or seamlessly **embedded inside any Ark-enabled wallet** via iframe.

The system is a monorepo containing three apps:
- **API Server** (`server/`) — NestJS backend with REST API, Swagger docs, and Ark protocol integration
- **Client** (`client/`) — React SPA for escrow users (create/accept requests, fund contracts, execute settlements)
- **Backoffice** (`backoffice/`) — React SPA for administrators/arbitrators (manage contracts, resolve disputes)

## Core Design

Built around a **2-of-3 multisig design** (Sender, Receiver, Arbitrator), powered by the Ark protocol via `@arkade-os/sdk`. Escrows use Virtual Escrow Contracts (VEC) — Taproot scripts with 6 spending paths that ensure funds can always be recovered.

**Collaborative Paths** (with Ark server co-signing):
- **Direct Settlement**: Sender + Receiver + Server (happy path)
- **Release Funds**: Receiver + Arbitrator + Server (arbitrator sides with receiver)
- **Return Funds**: Sender + Arbitrator + Server (arbitrator sides with sender)

**Unilateral Paths** (with CSV timelock, no server needed):
- Same 3 pairs without server, available after timelock expiry

## Key Features

- **Orderbook** — Public marketplace for escrow requests (buy/sell offers)
- **Contract Lifecycle** — Request → accept → fund → execute/dispute → settle
- **Funding Watcher** — Background service monitors VTXO funding events
- **Schnorr Auth** — Passwordless login using Bitcoin public key + Schnorr signature challenge
- **Real-time Updates** — Server-Sent Events for live contract status changes
- **Swagger API** — Interactive API documentation at `/api/v1/docs`
- **Backoffice Admin** — Protected admin panel for arbitration and contract management
- **Dual Deployment** — Standalone or embedded in Ark wallets via iframe

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 11, TypeScript 5.9, Node.js 24 |
| Database | SQLite (better-sqlite3) via TypeORM |
| Frontend | React 19, Vite 7, Tailwind CSS 4, Redux Toolkit |
| Crypto | @arkade-os/sdk, @noble/secp256k1, @noble/hashes |
| Auth | JWT + Schnorr signature challenge-response |
| Testing | Jest 30, Supertest |
| Quality | Biome.js (lint + format) |

## Use Cases

- **E-commerce** — Buyer funds escrow, seller ships, arbitrator resolves disputes
- **P2P Trading** — Two parties trade Bitcoin for goods/services with escrow protection
- **Freelance Payments** — Client funds escrow, freelancer delivers, funds released on approval
- **Security Deposits** — Tenant deposits into escrow, refunded at lease end

## Current Status: Alpha

The project is in active development with working escrow flows, client and backoffice apps, and Ark protocol integration.
