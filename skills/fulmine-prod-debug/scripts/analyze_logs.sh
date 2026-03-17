#!/bin/bash
# Analyze fulmine Docker JSON logs for errors
# Usage: analyze_logs.sh <logfile> [hours_back]
# Default: last 24 hours

set -euo pipefail

LOG_FILE="${1:?Usage: analyze_logs.sh <logfile> [hours_back]}"
HOURS="${2:-24}"

if [ ! -f "$LOG_FILE" ]; then
    echo "Error: File not found: $LOG_FILE" >&2
    exit 1
fi

if ! command -v jq &>/dev/null; then
    echo "Error: jq is required" >&2
    exit 1
fi

# Calculate cutoff time
CUTOFF=$(date -u -v-${HOURS}H +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -u -d "${HOURS} hours ago" +%Y-%m-%dT%H:%M:%S)

echo "=== Fulmine Log Analysis ==="
echo "File: $LOG_FILE"
echo "Period: last ${HOURS}h (since $CUTOFF)"
echo ""

# Total lines in period
TOTAL=$(jq -r --arg cutoff "$CUTOFF" 'select(.time >= $cutoff) | .time' "$LOG_FILE" 2>/dev/null | wc -l | tr -d ' ')
echo "Total log lines in period: $TOTAL"
echo ""

# Extract errors (case-insensitive match for error/ERR/panic/fatal in log field)
echo "=== ERRORS (last ${HOURS}h) ==="
jq -r --arg cutoff "$CUTOFF" '
  select(.time >= $cutoff) |
  select(.log | test("error|ERR|panic|fatal|FATAL|failed|Failed"; "i")) |
  "\(.time)\t\(.log)"
' "$LOG_FILE" 2>/dev/null | sort -t$'\t' -k1 | while IFS=$'\t' read -r ts msg; do
    short_ts=$(echo "$ts" | cut -c1-19)
    echo "[$short_ts] $msg"
done

echo ""
echo "=== ERROR SUMMARY ==="
# Group and count error patterns
jq -r --arg cutoff "$CUTOFF" '
  select(.time >= $cutoff) |
  select(.log | test("error|ERR|panic|fatal|FATAL|failed|Failed"; "i")) |
  .log
' "$LOG_FILE" 2>/dev/null | \
  sed 's/[0-9a-f]\{8,\}/<hex>/g' | \
  sed 's/[0-9]\{10,\}/<num>/g' | \
  sort | uniq -c | sort -rn | head -30

echo ""
echo "=== WARNINGS (count only) ==="
WARN_COUNT=$(jq -r --arg cutoff "$CUTOFF" '
  select(.time >= $cutoff) |
  select(.log | test("warn|WARN|warning"; "i")) |
  .time
' "$LOG_FILE" 2>/dev/null | wc -l | tr -d ' ')
echo "Warning count: $WARN_COUNT"
