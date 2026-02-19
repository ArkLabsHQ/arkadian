#!/bin/bash
# Debug script for arkadian resume issues

set -x  # Enable command tracing

cd /Users/dusansekulic/code/go/arkadian

echo "=== ARKADIAN RESUME DEBUG ==="
echo ""
echo "This will show exactly what commands are executed"
echo ""

# Run arkadian with bash tracing
bash -x scripts/arkadian --resume ddf1f6e8-bf18-42fd-93da-8eb976f5257c
