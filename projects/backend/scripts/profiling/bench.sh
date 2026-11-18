#!/usr/bin/env bash
# Usage: bench.sh <label> — restarts the profiling server on a cold cache, runs the load test, and saves the
# results to /tmp/ssr-prof/<label>.{txt,json}. Env: MIX, CONCURRENCY, DURATION_S, WARMUP_S, ROUTES, CPU_PROF=1.
set -euo pipefail
cd "$(dirname "$0")/../.."
label="${1:?label required}"
out=/tmp/ssr-prof
mkdir -p "$out"
pkill -INT -f "^bun .*profiling/server.ts" || true
while curl -s -o /dev/null localhost:8080/; do sleep 0.5; done
docker exec ssr-prof-redis redis-cli flushall >/dev/null
docker exec ssr-prof-pg psql -U test -d ssr_prof -qc "select pg_stat_statements_reset()" >/dev/null
profile_args=()
if [ -n "${PRELOAD:-}" ]; then
  profile_args+=(--preload "$PRELOAD")
fi
if [ "${CPU_PROF:-0}" = "1" ]; then
  rm -rf "$out/cpu-$label"
  profile_args+=(--cpu-prof --cpu-prof-md "--cpu-prof-dir=$out/cpu-$label")
fi
SKIP_SUGGESTED_MAPS_REFRESH=true nohup bun "${profile_args[@]}" scripts/profiling/server.ts > "$out/server-$label.log" 2>&1 &
server_pid=$!
until curl -s -o /dev/null localhost:8080/; do sleep 0.5; done
JSON_OUT="$out/$label.json" bun scripts/profiling/load.ts > "$out/$label.txt"
docker exec ssr-prof-pg psql -U test -d ssr_prof -Atc "select 'db_queries=' || sum(calls) || ' db_ms=' || round(sum(total_exec_time)) from pg_stat_statements" >> "$out/$label.txt"
grep '\[loop\]' "$out/server-$label.log" | tail -3 >> "$out/$label.txt" || true
kill -INT "$server_pid"
wait "$server_pid" || true
tail -6 "$out/$label.txt"
