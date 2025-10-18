#!/bin/bash

# Script to replace all absolute paths in markdown files with environment variables
# This makes documentation portable across different machines and users

set -e

ARKADIAN_DIR="/Users/dusansekulic/code/go/arkadian"

echo "🔍 Finding markdown files with absolute paths..."

# Find all markdown files with absolute paths
files=$(find "${ARKADIAN_DIR}/docs" -name "*.md" -type f -exec grep -l "/Users/dusansekulic" {} \; 2>/dev/null || true)

if [ -z "$files" ]; then
    echo "✅ No absolute paths found!"
    exit 0
fi

echo "📝 Found $(echo "$files" | wc -l) files to update"
echo ""

count=0

for file in $files; do
    echo "Processing: $(basename $file)"

    # Create backup
    cp "$file" "$file.bak"

    # Replace paths in order (most specific first to avoid partial replacements)
    # 1. Arkadian-specific paths
    sed -i '' 's|/Users/dusansekulic/code/go/arkadian|\${ARKADIAN_DIR}|g' "$file"
    sed -i '' 's|/Users/dusansekulic/\.claude|\${ARKADIAN_DIR}|g' "$file"

    # 2. Ark ecosystem repository paths (match the INDEX.md env vars)
    sed -i '' 's|/Users/dusansekulic/code/go/arkd|\${ARKD_REPO}|g' "$file"
    sed -i '' 's|/Users/dusansekulic/code/go/go-sdk|\${GO_SDK_REPO}|g' "$file"
    sed -i '' 's|/Users/dusansekulic/code/go/wallet|\${WALLET_REPO}|g' "$file"
    sed -i '' 's|/Users/dusansekulic/code/go/ark-faucet|\${ARK_FAUCET_REPO}|g' "$file"
    sed -i '' 's|/Users/dusansekulic/code/go/ark-simulator|\${ARK_SIMULATOR_REPO}|g' "$file"
    sed -i '' 's|/Users/dusansekulic/code/go/ark-telemetry|\${ARK_TELEMETRY_REPO}|g' "$file"
    sed -i '' 's|/Users/dusansekulic/code/go/ark-infra|\${ARK_INFRA_REPO}|g' "$file"
    sed -i '' 's|/Users/dusansekulic/code/go/kms-unlocker|\${KMS_UNLOCKER_REPO}|g' "$file"
    sed -i '' 's|/Users/dusansekulic/code/go/fulmine|\${FULMINE_REPO}|g' "$file"
    sed -i '' 's|/Users/dusansekulic/code/go/ark-docs|\${ARK_DOCS_REPO}|g' "$file"
    sed -i '' 's|/Users/dusansekulic/code/go/arkade-escrow|\${ARKADE_ESCROW_REPO}|g' "$file"

    # 3. Generic ark path (fallback for any /Users/dusansekulic/code/go/ark patterns)
    sed -i '' 's|/Users/dusansekulic/code/go/ark[^-]|\${ARKD_REPO}|g' "$file"

    # 4. Other common paths
    sed -i '' 's|/Users/dusansekulic/go/src/github\.com/ark-network|\${ARK_NETWORK_DIR}|g' "$file"

    # Check if file actually changed
    if ! diff -q "$file" "$file.bak" > /dev/null 2>&1; then
        echo "  ✓ Updated"
        rm "$file.bak"
        ((count++))
    else
        echo "  - No changes needed"
        mv "$file.bak" "$file"
    fi
done

echo ""
echo "✅ Updated $count files"
echo ""
echo "📋 Environment variables used:"
echo "  - ARKADIAN_DIR: Points to this arkadian documentation repo"
echo "  - ARKD_REPO, GO_SDK_REPO, etc.: Point to actual project repositories"
echo ""
echo "💡 These match the environment variables defined in docs/INDEX.md"
