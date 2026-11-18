import { COUNTRIES, DIFFICULTIES, LEADERBOARDS, PLAYERS, playerId, songHash } from "./fake-data";

const REQUEST_TIMEOUT_MS = 30_000;
const PAGE_COUNT = 20;
const REALM_ID = 1;
const CHARACTERISTIC = "Standard";
const PLAYLISTS = [
  "scoresaber-ranked-maps",
  "scoresaber-qualified-maps",
  "scoresaber-ranking-queue-maps",
  "scoresaber-trending",
] as const;
const LEADERBOARD_CATEGORIES = [
  "date_ranked",
  "date_created",
  "star_difficulty",
  "plays",
  "daily_plays",
  "trending",
] as const;
const SORT_DIRECTIONS = ["asc", "desc"] as const;
const ACCSABER_SORTS = ["date", "ap", "acc", "complexity", "ranking"] as const;
const ACCSABER_TYPES = ["overall", "true", "tech", "standard"] as const;
const HMDS = ["Quest 3", "Valve Index", "Rift S", "Quest 2", "PSVR2", "Bigscreen Beyond"] as const;
const CUSTOM_RANKED_CONFIG = Buffer.from(
  JSON.stringify({ stars: { min: 0, max: 13 }, sort: "stars" })
).toString("base64");

type Route = {
  name: string;
  weight: number;
  url: () => string;
};

type RouteStats = {
  latencies: number[];
  statuses: Record<string, number>;
  count: number;
};

type Summary = {
  name: string;
  count: number;
  rps: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  errorCount: number;
  errors: Record<string, number>;
};

function numberFromEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number, got "${raw}"`);
  }
  return value;
}

const TARGET = (process.env.TARGET ?? "http://localhost:8080").replace(/\/+$/, "");
const CONCURRENCY = numberFromEnv("CONCURRENCY", 128);
const DURATION_S = numberFromEnv("DURATION_S", 30);
const WARMUP_S = numberFromEnv("WARMUP_S", 0);
const JSON_OUT = process.env.JSON_OUT;

if (!Number.isInteger(CONCURRENCY) || CONCURRENCY < 1) {
  throw new Error(`CONCURRENCY must be an integer >= 1, got ${CONCURRENCY}`);
}
if (DURATION_S <= 0) {
  throw new Error(`DURATION_S must be greater than 0, got ${DURATION_S}`);
}
if (WARMUP_S < 0) {
  throw new Error(`WARMUP_S must be 0 or greater, got ${WARMUP_S}`);
}

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(values: readonly T[]) {
  return values[Math.floor(Math.random() * values.length)];
}

function skewedIndex(size: number) {
  return Math.min(size, Math.floor(size * Math.random() ** 3) + 1);
}

function randomPage() {
  return 1 + Math.floor(Math.random() ** 2 * PAGE_COUNT);
}

function randomPlayerId() {
  return playerId(skewedIndex(PLAYERS));
}

function randomLeaderboardId() {
  return skewedIndex(LEADERBOARDS);
}

function randomScoreId() {
  return randomLeaderboardId() * 10_000 + randomInt(1, 500);
}

function randomSongSearch() {
  return `Song ${randomInt(1, Math.ceil(LEADERBOARDS / DIFFICULTIES.length))}`;
}

function qs(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    search.set(key, String(value));
  }
  const text = search.toString();
  return text === "" ? "" : `?${text}`;
}

function playerScoresUrl(field: string, direction: string) {
  const search = Math.random() < 0.1 ? randomSongSearch() : undefined;
  return `/scores/player/ssr/${randomPlayerId()}/${field}/${direction}/${randomPage()}${qs({
    realmId: REALM_ID,
    search,
  })}`;
}

function medalScoresUrl(field: string, direction: string) {
  return `/scores/player/medals/${randomPlayerId()}/${field}/${direction}/${randomPage()}${qs({
    realmId: REALM_ID,
  })}`;
}

function suggestedMapsFilters() {
  const minStars = randomInt(2, 9);
  return {
    minStars,
    maxStars: Math.min(13, minStars + randomInt(1, 3)),
    minSeconds: randomInt(30, 120),
    maxSeconds: randomInt(180, 600),
    maxNps: randomInt(4, 12),
    minScores: randomInt(0, 50),
    referenceAccuracy: randomInt(850, 999) / 10,
    hidePlayed: Math.random() < 0.5,
    sort: pick(["gain", "bonus"]),
    limit: randomInt(10, 200),
  };
}

const routeTable: Route[] = [
  {
    name: "app.root",
    weight: 2,
    url: () => "/",
  },
  {
    name: "app.health",
    weight: 4,
    url: () => "/health",
  },
  {
    name: "app.statistics",
    weight: 2,
    url: () => "/statistics",
  },
  {
    name: "player.profile",
    weight: 35,
    url: () =>
      `/player/${randomPlayerId()}${qs({
        realmId: REALM_ID,
        type: pick(["basic", "full"]),
      })}`,
  },
  {
    name: "player.search",
    weight: 8,
    url: () => `/player/search${qs({ query: `Player${randomInt(1, 9999)}` })}`,
  },
  {
    name: "player.pps",
    weight: 12,
    url: () => `/player/pps/${randomPlayerId()}${qs({ realmId: REALM_ID })}`,
  },
  {
    name: "player.scores-chart",
    weight: 8,
    url: () => `/player/scores-chart/${randomPlayerId()}${qs({ realmId: REALM_ID })}`,
  },
  {
    name: "player.mini-ranking",
    weight: 5,
    url: () => `/player/mini-ranking/${randomPlayerId()}${qs({ realmId: REALM_ID })}`,
  },
  {
    name: "player.history",
    weight: 5,
    url: () =>
      `/player/history/${randomPlayerId()}${qs({
        realmId: REALM_ID,
        count: Math.random() < 0.2 ? -1 : randomInt(1, 200),
      })}`,
  },
  {
    name: "player.score-history",
    weight: 6,
    url: () =>
      `/player/score-history/${randomPlayerId()}/${randomLeaderboardId()}/${randomPage()}${qs({
        realmId: REALM_ID,
      })}`,
  },
  {
    name: "player.refresh",
    weight: 1,
    url: () => `/player/refresh/${randomPlayerId()}`,
  },
  {
    name: "scores.leaderboard",
    weight: 30,
    url: () => `/scores/leaderboard/${randomLeaderboardId()}/${randomPage()}${qs({ realmId: REALM_ID })}`,
  },
  {
    name: "scores.leaderboard.country",
    weight: 8,
    url: () =>
      `/scores/leaderboard/${randomLeaderboardId()}/${randomPage()}${qs({
        realmId: REALM_ID,
        country: pick(COUNTRIES),
      })}`,
  },
  {
    name: "scores.top",
    weight: 10,
    url: () =>
      `/scores/top/${randomPage()}${qs({
        realmId: REALM_ID,
        limit: randomInt(1, 50),
      })}`,
  },
  {
    name: "scores.by-id",
    weight: 6,
    url: () => `/scores/${randomScoreId()}${qs({ realmId: REALM_ID })}`,
  },
  {
    name: "scores.player.ssr.pp",
    weight: 20,
    url: () => playerScoresUrl("pp", "desc"),
  },
  {
    name: "scores.player.ssr.date",
    weight: 8,
    url: () => playerScoresUrl("date", "desc"),
  },
  {
    name: "scores.player.ssr.acc",
    weight: 5,
    url: () => playerScoresUrl("acc", "desc"),
  },
  {
    name: "scores.player.ssr.misses",
    weight: 4,
    url: () =>
      `/scores/player/ssr/${randomPlayerId()}/misses/asc/${randomPage()}${qs({
        realmId: REALM_ID,
        hmd: pick(HMDS),
      })}`,
  },
  {
    name: "scores.player.ssr.score",
    weight: 4,
    url: () => playerScoresUrl("score", "desc"),
  },
  {
    name: "scores.player.ssr.maxcombo",
    weight: 3,
    url: () =>
      `/scores/player/ssr/${randomPlayerId()}/maxcombo/desc/${randomPage()}${qs({
        realmId: REALM_ID,
        playerIds: [randomPlayerId(), randomPlayerId()].join(","),
      })}`,
  },
  {
    name: "scores.player.medals",
    weight: 6,
    url: () => medalScoresUrl("medals", "desc"),
  },
  {
    name: "scores.player.medals.date",
    weight: 3,
    url: () => medalScoresUrl("date", "desc"),
  },
  {
    name: "scores.player.scoresaber",
    weight: 5,
    url: () =>
      `/scores/player/scoresaber/${randomPlayerId()}/${pick(["top", "recent"])}/${randomPage()}${qs({
        search: Math.random() < 0.1 ? randomSongSearch() : undefined,
      })}`,
  },
  {
    name: "scores.player.accsaber",
    weight: 4,
    url: () =>
      `/scores/player/accsaber/${randomPlayerId()}/${randomPage()}${qs({
        sort: pick(ACCSABER_SORTS),
        direction: pick(SORT_DIRECTIONS),
        type: pick(ACCSABER_TYPES),
      })}`,
  },
  {
    name: "scores.history-graph",
    weight: 4,
    url: () => `/scores/history-graph/${randomPlayerId()}/${randomLeaderboardId()}`,
  },
  {
    name: "leaderboard.by-id",
    weight: 22,
    url: () => `/leaderboard/by-id/${randomLeaderboardId()}${qs({ realmId: REALM_ID })}`,
  },
  {
    name: "leaderboard.search",
    weight: 10,
    url: () => `/leaderboard/search${qs({ page: randomPage(), realmId: REALM_ID })}`,
  },
  {
    name: "leaderboard.search.filters",
    weight: 6,
    url: () => {
      const minStars = randomInt(0, 10);
      return `/leaderboard/search${qs({
        page: randomPage(),
        realmId: REALM_ID,
        category: pick(LEADERBOARD_CATEGORIES),
        sort: pick(SORT_DIRECTIONS),
        ranked: Math.random() < 0.6,
        qualified: Math.random() < 0.2,
        minStars,
        maxStars: minStars + randomInt(1, 3),
        query: randomSongSearch(),
      })}`;
    },
  },
  {
    name: "leaderboard.by-hash",
    weight: 5,
    url: () => {
      const leaderboardId = randomLeaderboardId();
      return `/leaderboard/by-hash/${songHash(leaderboardId)}/${DIFFICULTIES[(leaderboardId - 1) % DIFFICULTIES.length]}/${CHARACTERISTIC}${qs({ realmId: REALM_ID })}`;
    },
  },
  {
    name: "leaderboard.star-history",
    weight: 4,
    url: () => `/leaderboard/by-id/${randomLeaderboardId()}/star-history${qs({ realmId: REALM_ID })}`,
  },
  {
    name: "leaderboard.ranking-queue",
    weight: 3,
    url: () => "/leaderboard/ranking-queue",
  },
  {
    name: "ranking.page",
    weight: 15,
    url: () => `/ranking/${randomPage()}${qs({ realmId: REALM_ID })}`,
  },
  {
    name: "ranking.page.country",
    weight: 6,
    url: () =>
      `/ranking/${randomPage()}${qs({
        realmId: REALM_ID,
        country: pick(COUNTRIES),
        includeInactives: Math.random() < 0.2,
      })}`,
  },
  {
    name: "ranking.page.search",
    weight: 5,
    url: () =>
      `/ranking/${randomPage()}${qs({
        realmId: REALM_ID,
        search: `Player${randomInt(1, 9999)}`,
      })}`,
  },
  {
    name: "ranking.medals",
    weight: 6,
    url: () =>
      `/ranking/medals/${randomPage()}${qs({
        country: Math.random() < 0.5 ? pick(COUNTRIES) : undefined,
      })}`,
  },
  {
    name: "ranked-batches.list",
    weight: 5,
    url: () => `/ranked-batches/${qs({ page: randomInt(1, 5) })}`,
  },
  {
    name: "ranked-batches.markers",
    weight: 2,
    url: () => "/ranked-batches/markers",
  },
  {
    name: "ranked-batches.by-id",
    weight: 6,
    url: () => `/ranked-batches/${randomInt(1, 200)}`,
  },
  {
    name: "ranked-batches.players",
    weight: 4,
    url: () =>
      `/ranked-batches/${randomInt(1, 200)}/players${qs({
        page: randomInt(1, 5),
        direction: pick(["gain", "loss"]),
      })}`,
  },
  {
    name: "ranked-batches.player",
    weight: 4,
    url: () => `/ranked-batches/player/${randomPlayerId()}`,
  },
  {
    name: "ranked-batches.player.scores",
    weight: 4,
    url: () => `/ranked-batches/player/${randomPlayerId()}/${randomInt(1, 200)}/scores`,
  },
  {
    name: "realms.list",
    weight: 2,
    url: () => "/realms/",
  },
  {
    name: "realms.pp-curve",
    weight: 2,
    url: () => `/realms/${REALM_ID}/pp-curve`,
  },
  {
    name: "suggested-maps.list",
    weight: 4,
    url: () => `/suggested-maps/${qs({ playerId: randomPlayerId(), ...suggestedMapsFilters() })}`,
  },
  {
    name: "suggested-maps.reference",
    weight: 3,
    url: () => `/suggested-maps/${qs(suggestedMapsFilters())}`,
  },
  {
    name: "suggested-maps.player",
    weight: 5,
    url: () => `/playlist/suggested-maps/${randomPlayerId()}${qs(suggestedMapsFilters())}`,
  },
  {
    name: "playlist.by-id",
    weight: 3,
    url: () => {
      const id = pick(PLAYLISTS);
      return `/playlist/${Math.random() < 0.2 ? `${id}.bplist` : id}`;
    },
  },
  {
    name: "playlist.ranked-batch",
    weight: 2,
    url: () => `/playlist/ranked-batch/${randomInt(1, 200)}`,
  },
  {
    name: "playlist.custom-ranked",
    weight: 1,
    url: () => `/playlist/scoresaber-custom-ranked-maps${qs({ config: CUSTOM_RANKED_CONFIG })}`,
  },
  {
    name: "playlist.custom-ranked.bplist",
    weight: 1,
    url: () => `/playlist/scoresaber-custom-ranked-maps.bplist${qs({ config: CUSTOM_RANKED_CONFIG })}`,
  },
  {
    name: "playlist.snipe",
    weight: 1,
    url: () =>
      `/playlist/snipe${qs({
        user: randomPlayerId(),
        toSnipe: randomPlayerId(),
      })}`,
  },
  {
    name: "playlist.snipe.bplist",
    weight: 1,
    url: () =>
      `/playlist/snipe.bplist${qs({
        user: randomPlayerId(),
        toSnipe: randomPlayerId(),
      })}`,
  },
  {
    name: "playlist.self",
    weight: 1,
    url: () => `/playlist/self${qs({ user: randomPlayerId() })}`,
  },
  {
    name: "playlist.self.bplist",
    weight: 1,
    url: () => `/playlist/self.bplist${qs({ user: randomPlayerId() })}`,
  },
  {
    name: "beatsaver.map",
    weight: 3,
    url: () => {
      const leaderboardId = randomLeaderboardId();
      return `/beatsaver/map/${songHash(leaderboardId)}/${DIFFICULTIES[(leaderboardId - 1) % DIFFICULTIES.length]}/${CHARACTERISTIC}`;
    },
  },
  {
    name: "beatleader.scorestats",
    weight: 2,
    url: () => `/beatleader/scorestats/${randomScoreId()}`,
  },
  {
    name: "beatleader.replay",
    weight: 1,
    url: () => `/beatleader/replay/${randomScoreId()}.bsor`,
  },
  {
    name: "beatleader.overlay.score",
    weight: 1,
    url: () => `/beatleader/overlay-data/${randomScoreId()}`,
  },
  {
    name: "beatleader.overlay.ratings",
    weight: 1,
    url: () => {
      const leaderboardId = randomLeaderboardId();
      return `/beatleader/overlay-data/ratings/${songHash(leaderboardId)}/${DIFFICULTIES[(leaderboardId - 1) % DIFFICULTIES.length]}/${CHARACTERISTIC}`;
    },
  },
  {
    name: "beatleader.overlay.player",
    weight: 1,
    url: () => `/beatleader/overlay-data/player/${randomPlayerId()}`,
  },
  {
    name: "beatleader.overlay.player-map",
    weight: 1,
    url: () => {
      const leaderboardId = randomLeaderboardId();
      return `/beatleader/overlay-data/player/${randomPlayerId()}/${songHash(leaderboardId)}/${DIFFICULTIES[(leaderboardId - 1) % DIFFICULTIES.length]}/${CHARACTERISTIC}`;
    },
  },
];

const routeNames = new Set(routeTable.map(route => route.name));
if (routeNames.size !== routeTable.length) {
  throw new Error("Route table contains duplicate route names");
}

const requestedRoutes = process.env.ROUTES?.split(",")
  .map(name => name.trim())
  .filter(name => name !== "");

let routes: Route[] = routeTable;
if (requestedRoutes !== undefined && requestedRoutes.length > 0) {
  const unknown = requestedRoutes.filter(name => !routeNames.has(name));
  if (unknown.length > 0) {
    throw new Error(`Unknown ROUTES: ${unknown.join(", ")}. Known routes: ${[...routeNames].join(", ")}`);
  }
  routes = routeTable.filter(route => requestedRoutes.includes(route.name));
}

const PROD_WEIGHTS: Record<string, number> = {
  "scores.leaderboard": 400,
  "leaderboard.by-id": 413,
  "player.profile": 317,
  "player.mini-ranking": 314,
  "scores.player.scoresaber": 289,
  "leaderboard.star-history": 95,
  "scores.by-id": 52,
  "beatleader.replay": 2,
  "ranked-batches.player": 2,
  "player.history": 2,
  "ranking.page": 2,
};

if (process.env.MIX === "prod") {
  routes = routes.map(route => ({ ...route, weight: PROD_WEIGHTS[route.name] ?? 0.2 }));
}

let totalWeight = 0;
const cumulativeWeights: number[] = [];
for (const route of routes) {
  totalWeight += route.weight;
  cumulativeWeights.push(totalWeight);
}

function pickRoute() {
  const roll = Math.random() * totalWeight;
  for (let index = 0; index < routes.length; index++) {
    if (roll < cumulativeWeights[index]) {
      return routes[index];
    }
  }
  return routes[routes.length - 1];
}

const statsByRoute = new Map<string, RouteStats>();
for (const route of routes) {
  statsByRoute.set(route.name, { latencies: [], statuses: {}, count: 0 });
}

const allLatencies: number[] = [];
const allStatuses: Record<string, number> = {};

function record(route: Route, latency: number, status: number) {
  const stats = statsByRoute.get(route.name);
  if (stats === undefined) {
    throw new Error(`Missing stats bucket for route "${route.name}"`);
  }
  stats.latencies.push(latency);
  stats.count++;
  stats.statuses[status] = (stats.statuses[status] ?? 0) + 1;
}

const startedAt = performance.now();
const warmupEndsAt = startedAt + WARMUP_S * 1000;
const endsAt = startedAt + (WARMUP_S + DURATION_S) * 1000;

async function worker() {
  while (performance.now() < endsAt) {
    const route = pickRoute();
    const requestStartedAt = performance.now();
    let status = 0;
    try {
      const response = await fetch(`${TARGET}${route.url()}`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        redirect: "manual",
      });
      await response.arrayBuffer();
      status = response.status;
    } catch {
      status = 0;
    }
    const latency = performance.now() - requestStartedAt;
    if (requestStartedAt >= warmupEndsAt) {
      record(route, latency, status);
      allLatencies.push(latency);
      allStatuses[status] = (allStatuses[status] ?? 0) + 1;
    }
  }
}

console.log(
  `target=${TARGET} concurrency=${CONCURRENCY} duration=${DURATION_S}s warmup=${WARMUP_S}s routes=${routes.length}`
);
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function percentile(sorted: number[], fraction: number) {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * fraction));
  return sorted[index];
}

function errorCounts(statuses: Record<string, number>) {
  const errors: Record<string, number> = {};
  for (const [status, count] of Object.entries(statuses)) {
    const code = Number(status);
    if (code < 200 || code >= 300) {
      errors[status] = count;
    }
  }
  return errors;
}

const summaries: Summary[] = routes.map(route => {
  const stats = statsByRoute.get(route.name);
  if (stats === undefined) {
    throw new Error(`Missing stats bucket for route "${route.name}"`);
  }
  stats.latencies.sort((a, b) => a - b);
  const errors = errorCounts(stats.statuses);
  return {
    name: route.name,
    count: stats.count,
    rps: round(stats.count / DURATION_S),
    p50: round(percentile(stats.latencies, 0.5)),
    p95: round(percentile(stats.latencies, 0.95)),
    p99: round(percentile(stats.latencies, 0.99)),
    max: round(stats.latencies[stats.latencies.length - 1] ?? 0),
    errorCount: Object.values(errors).reduce((sum, count) => sum + count, 0),
    errors,
  };
});

summaries.sort((a, b) => b.p99 - a.p99);

allLatencies.sort((a, b) => a - b);
const totals = {
  count: allLatencies.length,
  rps: round(allLatencies.length / DURATION_S),
  p50: round(percentile(allLatencies, 0.5)),
  p95: round(percentile(allLatencies, 0.95)),
  p99: round(percentile(allLatencies, 0.99)),
  max: round(allLatencies[allLatencies.length - 1] ?? 0),
  errorCount: Object.values(errorCounts(allStatuses)).reduce((sum, count) => sum + count, 0),
  errors: errorCounts(allStatuses),
};

const header = ["route", "n", "rps", "p50", "p95", "p99", "max", "errors"];
const rows = summaries.map(summary => [
  summary.name,
  String(summary.count),
  summary.rps.toFixed(1),
  `${summary.p50.toFixed(1)}ms`,
  `${summary.p95.toFixed(1)}ms`,
  `${summary.p99.toFixed(1)}ms`,
  `${summary.max.toFixed(1)}ms`,
  summary.errorCount === 0
    ? "0"
    : Object.entries(summary.errors)
        .map(([status, count]) => `${status}:${count}`)
        .join(" "),
]);

const widths = header.map((title, index) => {
  const cells = rows.map(row => row[index].length);
  return Math.max(title.length, ...cells);
});

function formatRow(cells: string[]) {
  return cells
    .map((cell, index) => (index === 0 ? cell.padEnd(widths[index]) : cell.padStart(widths[index])))
    .join("  ");
}

console.log(formatRow(header));
for (const row of rows) {
  console.log(formatRow(row));
}

const errorsText =
  totals.errorCount === 0
    ? "0"
    : Object.entries(totals.errors)
        .map(([status, count]) => `${status}:${count}`)
        .join(" ");

console.log(
  `TOTAL requests=${totals.count} rps=${totals.rps.toFixed(1)} p50=${totals.p50.toFixed(1)}ms p95=${totals.p95.toFixed(1)}ms p99=${totals.p99.toFixed(1)}ms max=${totals.max.toFixed(1)}ms errors=${totals.errorCount} (${errorsText})`
);

if (JSON_OUT !== undefined && JSON_OUT !== "") {
  const payload = {
    target: TARGET,
    concurrency: CONCURRENCY,
    durationS: DURATION_S,
    warmupS: WARMUP_S,
    generatedAt: new Date().toISOString(),
    routes: summaries,
    totals,
  };
  await Bun.write(JSON_OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`wrote ${JSON_OUT}`);
}
