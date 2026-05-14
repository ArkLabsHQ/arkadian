# Banco — How to Run

## Prerequisites

- Node.js 22+ (< 23)
- pnpm 10+
- Docker (for regtest E2E tests)
- nigiri (for regtest environment)

## Development Setup

```sh
git clone --recurse-submodules https://github.com/arkade-os/banco.git
cd banco
pnpm install
pnpm build
```

## Regtest Environment

E2E tests run against a local stack: nigiri + arkd + introspector.

```sh
# Full clean start
pnpm regtest

# Or step by step:
pnpm regtest:start   # boot nigiri, arkd, introspector
pnpm test:e2e        # run e2e tests
pnpm regtest:stop    # stop (preserves volumes)
pnpm regtest:clean   # stop + wipe volumes
```

The `regtest/` directory is the [arkade-regtest](https://github.com/ArkLabsHQ/arkade-regtest) submodule. Overrides for arkd image and Bitcoin Core config are in `.env.regtest`. The introspector is added via `docker-compose.introspector.yml`.
