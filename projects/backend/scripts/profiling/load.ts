export {};

const BASE = process.env.TARGET ?? "http://localhost:8080";
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 64);
const DURATION_S = Number(process.env.DURATION_S ?? 30);
const MODE = process.env.MODE ?? "mixed";
const LEADERBOARDS = Number(process.env.LEADERBOARDS ?? 2000);
const PAGES = Number(process.env.PAGES ?? 41);

function pickUrl() {
  const id = 1 + Math.floor(Math.random() * LEADERBOARDS);
  const page = 1 + Math.floor(Math.random() * PAGES);
  const scores = `${BASE}/scores/leaderboard/${id}/${page}`;
  const byId = `${BASE}/leaderboard/by-id/${id}`;
  if (MODE === "scores") {
    return scores;
  }
  if (MODE === "by-id") {
    return byId;
  }
  return Math.random() < 0.5 ? scores : byId;
}

const latencies: Record<string, number[]> = {};
let errors = 0;
const deadline = Date.now() + DURATION_S * 1000;

async function worker() {
  while (Date.now() < deadline) {
    const url = pickUrl();
    const route = url.includes("/scores/") ? "scores" : "by-id";
    const startedAt = performance.now();
    try {
      const response = await fetch(url);
      await response.arrayBuffer();
      if (!response.ok) {
        errors++;
      }
    } catch {
      errors++;
    }
    (latencies[route] ??= []).push(performance.now() - startedAt);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

for (const [route, values] of Object.entries(latencies)) {
  values.sort((a, b) => a - b);
  const pct = (p: number) => values[Math.min(values.length - 1, Math.floor(values.length * p))].toFixed(0);
  console.log(
    `${route}: n=${values.length} rps=${(values.length / DURATION_S).toFixed(1)} p50=${pct(0.5)}ms p95=${pct(0.95)}ms p99=${pct(0.99)}ms max=${values[values.length - 1].toFixed(0)}ms`
  );
}
console.log(`errors=${errors}`);
