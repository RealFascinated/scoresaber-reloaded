#!/usr/bin/env bash
# Usage: per-route.sh <out.tsv> — loads each route alone and records its throughput and latency.
set -euo pipefail
cd "$(dirname "$0")/../.."
out="${1:-/tmp/ssr-prof/per-route.tsv}"
routes=$(grep -oE 'name: "[^"]+"' scripts/profiling/load.ts | cut -d'"' -f2)
printf "route\trps\tp50\tp99\terrors\n" > "$out"
for route in $routes; do
  line=$(ROUTES="$route" CONCURRENCY="${CONCURRENCY:-32}" DURATION_S="${DURATION_S:-8}" WARMUP_S=1 bun scripts/profiling/load.ts | grep -E "^$route " || true)
  echo "$line" | awk -v OFS='\t' '{print $1,$3,$4,$6,$NF}' >> "$out"
done
sort -t$'\t' -k2 -n "$out" | column -t
