# Claude Code - Deployment

> Source: https://code.claude.com/docs/en/third-party-integrations

---

## Enterprise Deployment Overview

### Provider Comparison

| Feature | Anthropic | Amazon Bedrock | Google Vertex AI | Microsoft Foundry |
|---------|-----------|----------------|------------------|-------------------|
| **Regions** | Supported countries | Multiple AWS regions | Multiple GCP regions | Multiple Azure regions |
| **Prompt caching** | Enabled by default | Enabled by default | Enabled by default | Enabled by default |
| **Authentication** | API key | API key or AWS credentials | GCP credentials | API key or Microsoft Entra ID |
| **Cost tracking** | Dashboard | AWS Cost Explorer | GCP Billing | Azure Cost Management |
| **Enterprise features** | Teams, usage monitoring | IAM policies, CloudTrail | IAM roles, Cloud Audit Logs | RBAC policies, Azure Monitor |

### Configuration Overview

- **Corporate proxy**: HTTP/HTTPS proxy for traffic routing (via `HTTPS_PROXY` or `HTTP_PROXY`)
- **LLM Gateway**: Service handling authentication with provider-compatible endpoints

Both can be used simultaneously.

### Provider-Specific Configurations

**Bedrock with Corporate Proxy:**
```bash
export CLAUDE_CODE_USE_BEDROCK=1
export AWS_REGION=us-east-1
export HTTPS_PROXY='https://proxy.example.com:8080'
```

**Bedrock with LLM Gateway:**
```bash
export CLAUDE_CODE_USE_BEDROCK=1
export ANTHROPIC_BEDROCK_BASE_URL='https://your-llm-gateway.com/bedrock'
export CLAUDE_CODE_SKIP_BEDROCK_AUTH=1
```

**Foundry with LLM Gateway:**
```bash
export CLAUDE_CODE_USE_FOUNDRY=1
export ANTHROPIC_FOUNDRY_BASE_URL='https://your-llm-gateway.com'
export CLAUDE_CODE_SKIP_FOUNDRY_AUTH=1
```

**Vertex AI with LLM Gateway:**
```bash
export CLAUDE_CODE_USE_VERTEX=1
export ANTHROPIC_VERTEX_BASE_URL='https://your-llm-gateway.com/vertex'
export CLAUDE_CODE_SKIP_VERTEX_AUTH=1
```

### Best Practices for Organizations

1. Deploy CLAUDE.md files at organization and repository levels
2. Create "one-click" installation approaches
3. Start with codebase Q&A and smaller tasks
4. Configure managed permissions
5. Use MCP for integrations with ticket management and error logs

---

## Amazon Bedrock

### Prerequisites

- Active AWS account with Bedrock access enabled
- Access to desired Claude models
- AWS CLI installed and configured (optional)
- Appropriate IAM permissions

### Setup Process

**Step 1: Submit Use Case Details** (first-time only)

Navigate to Amazon Bedrock console → Chat/Text playground → Choose Anthropic model.

**Step 2: Configure AWS Credentials**

```bash
# AWS CLI Setup
aws configure

# Environment Variables (Access Key)
export AWS_ACCESS_KEY_ID=your-access-key-id
export AWS_SECRET_ACCESS_KEY=your-secret-access-key
export AWS_SESSION_TOKEN=your-session-token

# SSO Profile
aws sso login --profile=<your-profile-name>
export AWS_PROFILE=your-profile-name

# Bedrock API Keys
export AWS_BEARER_TOKEN_BEDROCK=your-bedrock-api-key
```

**Step 3: Configure Claude Code**

```bash
export CLAUDE_CODE_USE_BEDROCK=1
export AWS_REGION=us-east-1
export ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION=us-west-2
```

**Step 4: Model Configuration**

| Model Type | Default Value |
|-----------|---------------|
| Primary | `global.anthropic.claude-sonnet-4-5-20250929-v1:0` |
| Small/Fast | `us.anthropic.claude-haiku-4-5-20251001-v1:0` |

```bash
export ANTHROPIC_MODEL='global.anthropic.claude-sonnet-4-5-20250929-v1:0'
export ANTHROPIC_SMALL_FAST_MODEL='us.anthropic.claude-haiku-4-5-20251001-v1:0'
```

**Step 5: Output Token Configuration**

```bash
export CLAUDE_CODE_MAX_OUTPUT_TOKENS=4096
export MAX_THINKING_TOKENS=1024
```

### IAM Configuration

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowModelAndInferenceProfileAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:ListInferenceProfiles"
      ],
      "Resource": [
        "arn:aws:bedrock:*:*:inference-profile/*",
        "arn:aws:bedrock:*:*:application-inference-profile/*",
        "arn:aws:bedrock:*:*:foundation-model/*"
      ]
    }
  ]
}
```

---

## Google Vertex AI

### Prerequisites

- GCP account with billing enabled
- Project with Vertex AI API enabled
- Access to desired Claude models
- Google Cloud SDK (`gcloud`) installed
- Quota allocated in desired GCP region

### Setup Process

**1. Enable Vertex AI API:**
```bash
gcloud config set project YOUR-PROJECT-ID
gcloud services enable aiplatform.googleapis.com
```

**2. Request Model Access:**
Navigate to Vertex AI Model Garden, search for Claude, request access (24-48 hours).

**3. Configure GCP Credentials:**
Claude Code uses standard Google Cloud authentication.

**4. Configure Claude Code:**
```bash
export CLAUDE_CODE_USE_VERTEX=1
export CLOUD_ML_REGION=global
export ANTHROPIC_VERTEX_PROJECT_ID=YOUR-PROJECT-ID
# Optional: DISABLE_PROMPT_CACHING=1
```

**5. Model Configuration:**
Default models: `claude-sonnet-4-5@20250929` (primary) and `claude-haiku-4-5@20251001` (fast).

### IAM Configuration

The `roles/aiplatform.user` role provides necessary permissions.

### 1M Token Context Window

Claude Sonnet 4 and 4.5 support extended context windows (currently in beta).

---

## Microsoft Foundry

### Prerequisites

- Azure subscription with Microsoft Foundry access
- RBAC permissions for creating resources and deployments
- Azure CLI installed (optional)

### Setup Process

**Step 1: Provision Microsoft Foundry Resource**

Create deployments for Claude Opus, Claude Sonnet, and Claude Haiku.

**Step 2: Configure Azure Credentials**

**API Key Authentication:** Set environment variable with API key.

**Microsoft Entra ID Authentication:** Uses Azure SDK default credential chain automatically.

**Step 3: Configure Claude Code**
- Enable Microsoft Foundry integration
- Specify Azure resource name or base URL
- Configure model deployment names

### Azure RBAC Configuration

Use "Azure AI User" or "Cognitive Services User" roles.

---

## Network Configuration

### Proxy Configuration

```bash
# HTTPS proxy (recommended)
export HTTPS_PROXY=https://proxy.example.com:8080

# HTTP proxy
export HTTP_PROXY=http://proxy.example.com:8080

# Bypass proxy
export NO_PROXY="localhost 192.168.1.1 example.com"

# With authentication
export HTTPS_PROXY=http://username:password@proxy.example.com:8080
```

**Note:** Claude Code does not support SOCKS proxies.

### Custom CA Certificates

```bash
export NODE_EXTRA_CA_CERTS=/path/to/ca-cert.pem
```

### mTLS Authentication

```bash
export CLAUDE_CODE_CLIENT_CERT=/path/to/client-cert.pem
export CLAUDE_CODE_CLIENT_KEY=/path/to/client-key.pem
export CLAUDE_CODE_CLIENT_KEY_PASSPHRASE="your-passphrase"
```

### Network Access Requirements

Required URLs:
- `api.anthropic.com` - Claude API
- `claude.ai` - WebFetch safeguards
- `statsig.anthropic.com` - Telemetry
- `sentry.io` - Error reporting

---

## LLM Gateway

### Gateway Requirements

Must support at least one API format:
- Anthropic Messages Format
- Bedrock InvokeModel Format
- Vertex rawPredict Format

### LiteLLM Configuration

**Static API Key:**
```bash
export ANTHROPIC_AUTH_TOKEN=sk-litellm-static-key
```

**Dynamic API Key with Helper Script:**
```json
{
  "apiKeyHelper": "~/bin/get-litellm-key.sh"
}
```

### Endpoint Configuration

**Unified Endpoint (Recommended):**
```bash
export ANTHROPIC_BASE_URL=https://litellm-server:4000
```

**Provider-Specific Pass-Through:**
```bash
# Claude API via LiteLLM
export ANTHROPIC_BASE_URL=https://litellm-server:4000/anthropic

# Amazon Bedrock via LiteLLM
export ANTHROPIC_BEDROCK_BASE_URL=https://litellm-server:4000/bedrock
export CLAUDE_CODE_SKIP_BEDROCK_AUTH=1
export CLAUDE_CODE_USE_BEDROCK=1

# Google Vertex AI via LiteLLM
export ANTHROPIC_VERTEX_BASE_URL=https://litellm-server:4000/vertex_ai/v1
export ANTHROPIC_VERTEX_PROJECT_ID=your-gcp-project-id
export CLAUDE_CODE_SKIP_VERTEX_AUTH=1
export CLAUDE_CODE_USE_VERTEX=1
export CLOUD_ML_REGION=us-east5
```

---

## Development Containers

### Key Features

- Production-ready Node.js 20
- Custom firewall restricting network access
- Developer-friendly tools (git, ZSH, fzf)
- VS Code integration
- Session persistence
- Cross-platform compatibility

### Getting Started

1. Install VS Code and Remote - Containers extension
2. Clone the Claude Code reference implementation
3. Open in VS Code
4. Click "Reopen in Container"

### Security Features

- Precise access control to whitelisted domains only
- Allowed outbound DNS and SSH connections
- Default-deny policy
- Startup firewall verification
- Isolation from main system

**Important:** Only use devcontainers with trusted repositories.

---

## Sandboxing

### Overview

Native sandboxing provides filesystem and network isolation for safer agent execution.

### Why Sandboxing Matters

Traditional permission-based security challenges:
- Approval fatigue
- Productivity impact
- Limited autonomy

Sandboxing addresses these by:
1. Defining clear access boundaries
2. Reducing permission prompts for safe operations
3. Maintaining security through OS-level enforcement

### How It Works

**Filesystem Isolation:**
- Default write access: Current working directory and subdirectories
- Default read access: Entire computer except denied directories
- Customizable via settings

**Network Isolation:**
- Domain restrictions via proxy server
- User confirmation for new domains
- All child processes inherit restrictions

**OS-Level Enforcement:**
- Linux: Uses bubblewrap
- macOS: Uses Seatbelt sandbox

### Enable Sandboxing

Run `/sandbox` slash command to open mode selection menu.

### Sandbox Modes

- **Auto-allow mode**: Bash commands run automatically within sandbox
- **Regular permissions mode**: All bash commands require approval

### Security Benefits

Protection against:
- Malicious dependencies
- Compromised scripts
- Social engineering attacks
- Prompt injection attempts

### Configuration

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "excludedCommands": ["docker"],
    "network": {
      "allowUnixSockets": ["/var/run/docker.sock"],
      "allowLocalBinding": true
    }
  }
}
```

### Open Source

Available as npm package:
```bash
npx @anthropic-ai/sandbox-runtime <command-to-sandbox>
```
