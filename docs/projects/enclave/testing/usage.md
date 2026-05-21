# Usage

## Prerequisites

- Docker (reproducible EIF builds via pinned NixOS container)
- [Nix](https://nixos.org/) (local hash computation / native builds)
- AWS CLI v2 with credentials
- AWS CDK CLI (`npm install -g aws-cdk`)
- `jq`
- App-specific: Go 1.25+, Node.js 22+, or .NET SDK 10.0+

## Install the CLI

```sh
go install github.com/ArkLabsHQ/introspector-enclave/cli/cmd/enclave@latest
```

Or build from source with SDK hashes baked in:

```sh
make sdk-hashes REV=v1.0.0   # compute source hash
make vendor-hash             # compute vendor hash
make build                   # produce ./enclave-cli with hashes baked via ldflags
make install                 # install to $GOPATH/bin
```

## Initialize a Project

Generate a complete template (recommended):

```sh
enclave generate template --golang my-app
enclave generate template --nodejs my-app
enclave generate template --dotnet my-app
```

Or add enclave support to an existing repo:

```sh
enclave init
```

Both create `enclave/enclave.yaml` and `enclave/flake.nix` (language-specific). If `make build` baked hashes, `sdk:` is auto-populated.

> **Layout:** the CLI accepts either the canonical `<root>/enclave/enclave.yaml` or a flattened `<root>/enclave.yaml` ("bare layout"). `findRepoRoot` walks upward looking for either, which unblocks projects that don't want a separate `enclave/` directory.

## Configure Hashes

```sh
enclave setup                   # Go (default), runs in Docker
enclave setup --language nodejs # rewrites enclave/flake.nix
enclave setup                   # uses local Nix
```

This populates `nix_owner`, `nix_repo`, `nix_rev`, `nix_hash`, `nix_vendor_hash` in `enclave/enclave.yaml` from the git remote and HEAD.

> **Node.js:** `package-lock.json` must be committed — Nix needs it for reproducible deps hashes.

## Configure `enclave/enclave.yaml`

```yaml
name: my-app
region: us-east-1
account: "123456789012"

sdk:
  rev: "v1.0.0"
  hash: "sha256-..."
  vendor_hash: "sha256-..."

app:
  language: go
  nix_owner: my-org
  nix_repo: my-app
  nix_rev: "abc123..."
  nix_hash: "sha256-..."
  nix_vendor_hash: "sha256-..."
  nix_sub_packages: ["cmd"]
  binary_name: my-app
  env:
    MY_APP_PORT: "7074"
    MY_APP_DATADIR: "/app/data"

secrets:
  - name: signing_key
    env_var: APP_SIGNING_KEY
```

`app.env` values are baked into the EIF (PCR0-attested schema). Override values at deploy without rebuilding via:

1. `TF_VAR_env_values='{"KEY":"value"}' tofu apply` (env var)
2. `*.auto.tfvars.json` files committed per environment
3. `tofu apply -var 'env_values={...}'` (highest precedence)

PCR0 stays identical across env-value overrides — only the schema is attested.

## Validate

```sh
enclave init   # re-run when enclave.yaml exists; validates and prints summary
```

## Build the EIF

```sh
enclave build              # via Docker + Nix (reproducible)
```

Outputs `artifacts/image.eif` and `artifacts/pcr.json` (PCR0/1/2).

## Deploy

```sh
enclave tofu               # or: enclave tofu --remote
enclave deploy             # CDK: VPC, EC2, KMS, IAM, S3, secrets
enclave verify             # confirm attestation + PCR0 match
enclave status             # show stack outputs
```

## Update Your App

**Code-only (no deps changes):**

```sh
git push
enclave update     # fast: nix_rev + nix_hash only (~1s)
enclave build && enclave deploy
```

**Dependency changes (go.mod, package-lock.json, etc.):**

```sh
git push
enclave setup     # full: recomputes vendor/deps hash too
enclave build && enclave deploy
```

**CLI / runtime version bump:**

```sh
go install github.com/ArkLabsHQ/introspector-enclave/cli/cmd/enclave@latest
enclave upgrade    # rewrites runtime: {rev,hash,vendor_hash} in enclave.yaml to the CLI's baked coordinates
enclave build && enclave deploy
```

`enclave upgrade` only touches the top-level `runtime:` block, so `app.nix_rev` / `app.nix_hash` / `app.nix_vendor_hash` are never disturbed. It is idempotent — re-running with no version change prints `Already on runtime <rev> — nothing to do.`

## Lock the KMS Key (irreversible)

```sh
enclave lock
```

After this, **only** the attested PCR0 can `kms:Decrypt`. Even AWS root cannot rewrite the policy. Future PCR0 changes require the locked-key migration flow (`POST /migrate`).

## CI/CD Workflows

`enclave init` and `enclave generate template` scaffold three GitHub Actions workflows:

- **`deploy-enclave.yml`** — manual `workflow_dispatch`. Builds EIF, deploys CDK, publishes a GitHub Release manifest (`deployment.json`), generates artifact attestations, runs `enclave verify`, publishes a status page to `gh-pages` at `/attestation/`. Required repo vars: `AWS_ROLE_ARN`, `AWS_REGION`. Permissions: `id-token: write`, `contents: write`, `attestations: write`.
- **`destroy-enclave.yml`** — manual. Tears down the CDK stack with `enclave destroy --force`.
- **`verify-enclave.yml`** — daily cron (08:00 UTC) + manual. Verifies the live enclave from the manifest's PCR0 + base URL and updates the status page.

Manual verification:

```sh
enclave verify --base-url https://<elastic-ip> --expected-pcr0 <pcr0>
gh attestation verify deployment.json --repo <owner>/<repo>
```

### Deployer IAM Policy

The repo ships `deploy-iam-policy.json` at the root — a least-privilege template for the OIDC role assumed by the deployer (`AWS_ROLE_ARN`). Attach (or merge) it to that role so `enclave deploy` / `tofu apply` can manage the stack. Highlights: broad `ec2`/`s3`/`kms`/`ssm`/`dynamodb` access for stack lifecycle, IAM read for `terraform plan` drift detection, and IAM write scoped to `*enclave*` role + instance-profile ARNs (plus `iam:PassRole` guarded to `ec2.amazonaws.com`).
