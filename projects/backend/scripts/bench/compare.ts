/** Compares two route benchmark runs: bun run scripts/bench/compare.ts <before-label> <after-label> */
import { readFileSync } from "node:fs";

type Row = { name: string; status: number; median: number; p95: number; bytes: number };
const [beforeLabel, afterLabel] = process.argv.slice(2);
const read = (label: string): Map<string, Row> =>
  new Map(
    (JSON.parse(readFileSync(`/tmp/bench-${label}.json`, "utf8")) as Row[]).map(row => [row.name, row])
  );
const before = read(beforeLabel);
const after = read(afterLabel);

const lines: string[] = [];
for (const [name, a] of [...after].sort((x, y) => y[1].median - x[1].median)) {
  const b = before.get(name);
  if (!b) {
    continue;
  }
  const change = b.median > 0 ? b.median / Math.max(a.median, 0.01) : 1;
  lines.push(
    `${String(a.status).padEnd(4)}${name.slice(0, 62).padEnd(64)}${b.median.toFixed(1).padStart(8)} -> ${a.median.toFixed(1).padStart(7)} ms  (${change >= 1.15 ? `${change.toFixed(1)}x faster` : change <= 0.87 ? `${(1 / change).toFixed(1)}x SLOWER` : "same"})`
  );
}
console.log(lines.join("\n"));
