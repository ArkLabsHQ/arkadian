#!/usr/bin/env bash
# Generate ~/.claude/settings.json from .env file
# Reads all environment variables from .env and populates settings.json

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ARKADIAN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ARKADIAN_DIR/.env"
TEMPLATE_FILE="$ARKADIAN_DIR/.claude-settings.template.json"
SETTINGS_FILE="$HOME/.claude/settings.json"

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env file not found at: $ENV_FILE"
  echo "   Run 'make generate-env' first"
  exit 1
fi

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
  echo "❌ Template file not found at: $TEMPLATE_FILE"
  exit 1
fi

# Backup existing settings
if [ -f "$SETTINGS_FILE" ]; then
  backup_file="$SETTINGS_FILE.backup.$(date +%Y%m%d_%H%M%S)"
  cp "$SETTINGS_FILE" "$backup_file"
  echo "✓ Backed up existing settings to: $backup_file"
fi

# Source .env to get all variables
set -a
source "$ENV_FILE"
set +a

# Generate JSON env block from .env
echo "Reading environment variables from .env..."
env_json=""

while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue

  # Remove any quotes from value
  value=$(echo "$value" | sed 's/^["'\'']\(.*\)["'\'']$/\1/')

  # Add to JSON (with proper comma handling)
  if [ -z "$env_json" ]; then
    env_json="\"$key\": \"$value\""
  else
    env_json="$env_json,\n    \"$key\": \"$value\""
  fi
done < "$ENV_FILE"

# Read template
template_content=$(cat "$TEMPLATE_FILE")

# Replace the env section in template
# Find the "env": { } section and replace it with our generated JSON
updated_content=$(echo "$template_content" | awk -v env_json="$env_json" '
  BEGIN { in_env=0; printed_env=0 }
  /"env": \{/ {
    in_env=1
    print "  \"env\": {"
    printf "    %s\n", env_json
    print "  },"
    printed_env=1
    next
  }
  /\},$/ && in_env {
    in_env=0
    next
  }
  in_env { next }
  { print }
')

# Write to settings file
mkdir -p "$(dirname "$SETTINGS_FILE")"
echo "$updated_content" > "$SETTINGS_FILE"

echo "✅ Generated $SETTINGS_FILE with $(grep -c '=' "$ENV_FILE") environment variables"
echo ""
echo "Variables configured:"
grep -v '^#' "$ENV_FILE" | grep -v '^$' | sed 's/=.*//' | sed 's/^/  - /'
echo ""
echo "⚠️  Important: Restart Claude Code for settings to take effect"
