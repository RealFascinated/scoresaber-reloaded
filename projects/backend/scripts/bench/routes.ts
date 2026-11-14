/**
 * Benchmarks every public API route end to end (Elysia handler -> services -> Postgres) against the
 * seeded bench database. Upstream HTTP (ScoreSaber, BeatLeader, BeatSaver, AccSaber) is stubbed from
 * the seeded data, so what is measured is local work only. Run in development mode, where
 * CacheService bypasses its caches, so every call pays the real cost.
 *
 *   DATABASE_URL=postgresql://test:test@localhost:5435/ssr_test_bench \
 *     bun run --preload ./test/env.ts scripts/bench/routes.ts <label> [filter]
 *
 * Results are written to /tmp/bench-<label>.json; compare two with scripts/bench/compare.ts.
 */
import type { ScoreSaberLeaderboardToken } from "@ssr/common/schemas/scoresaber/tokens/v1/leaderboard";
import type { ScoreSaberLeaderboardScoresPageToken } from "@ssr/common/schemas/scoresaber/tokens/v1/leaderboard-scores-page";
import type { ScoreSaberPlayerScoresPageToken } from "@ssr/common/schemas/scoresaber/tokens/v1/player-scores-page";
import type { ScoreSaberScoreToken } from "@ssr/common/schemas/scoresaber/tokens/v1/score";
import type { ScoreSaberV2PlayerToken } from "@ssr/common/schemas/scoresaber/tokens/v2/player/player";
import { mkdirSync, writeFileSync } from "node:fs";
import { Pool } from "pg";
import BeatSaverService from "../../src/service/external/beatsaver.service";
import { ScoreSaberApiService } from "../../src/service/external/scoresaber-api.service";
import MetricsService from "../../src/service/infra/metrics.service";
import StorageService from "../../src/service/infra/storage.service";
import { createTestApp } from "../../test/helpers/create-test-app";
import { buildScoreSaberV2PlayerToken } from "../../test/helpers/fixtures";
import { request } from "../../test/helpers/request";

const label = process.argv[2] ?? "run";
const filter = process.argv[3];
const ITERATIONS = Number(process.env.BENCH_ITERATIONS ?? 25);
const WARMUP = Number(process.env.BENCH_WARMUP ?? 25);

const WHALE = "76561198099999999";
const PLAYER = "76561198000000010";
const LEADERBOARD_ID = 1;

// Any request that is not served by a stub must not reach the real network.
globalThis.fetch = (async () => {
  throw new Error("bench: network disabled");
}) as typeof fetch;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DIFFICULTY_NUMBER: Record<string, number> = { Easy: 1, Normal: 3, Hard: 5, Expert: 7, ExpertPlus: 9 };

interface SeedLeaderboard {
  id: number;
  songHash: string;
  difficulty: string;
}

async function loadSeedLeaderboard(id: number): Promise<SeedLeaderboard> {
  const { rows } = await pool.query(
    `SELECT id, "songHash", difficulty FROM "scoresaber-leaderboards" WHERE id = $1`,
    [id]
  );
  return rows[0];
}

function leaderboardToken(row: {
  id: number;
  songHash: string;
  songName: string;
  difficulty: string;
  maxScore: number;
  ranked: boolean;
  stars: number;
}): ScoreSaberLeaderboardToken {
  const difficulty = {
    leaderboardId: row.id,
    difficulty: DIFFICULTY_NUMBER[row.difficulty] ?? 9,
    gameMode: "SoloStandard",
    difficultyRaw: `_${row.difficulty}_SoloStandard`,
  };
  return {
    id: row.id,
    songHash: row.songHash,
    songName: row.songName,
    songSubName: "",
    songAuthorName: "Artist",
    levelAuthorName: "Mapper",
    difficulty,
    maxScore: row.maxScore,
    maxScoreEx: row.maxScore,
    createdDate: new Date().toISOString(),
    rankedDate: row.ranked ? new Date().toISOString() : null,
    qualifiedDate: null,
    lovedDate: null,
    ranked: row.ranked,
    qualified: false,
    loved: false,
    maxPP: 0,
    stars: row.stars,
    positiveModifiers: false,
    playerScore: null,
    plays: 10,
    dailyPlays: 1,
    coverImage: "",
    difficulties: null,
  };
}

function scoreToken(row: {
  scoreId: number;
  playerId: string;
  name: string;
  score: number;
  accuracy: number;
  missedNotes: number;
  badCuts: number;
  maxCombo: number;
  fullCombo: boolean;
  timestamp: Date;
  pp: number | null;
  rank: number;
}): ScoreSaberScoreToken {
  return {
    id: row.scoreId,
    leaderboardPlayerInfo: {
      id: row.playerId,
      name: row.name,
      profilePicture: "https://cdn.example/a.png",
      country: "US",
      permissions: 0,
      badges: "",
      role: "",
    },
    rank: row.rank,
    baseScore: row.score,
    modifiedScore: row.score,
    pp: row.pp ?? 0,
    weight: 1,
    modifiers: "",
    multiplier: 1,
    badCuts: row.badCuts,
    missedNotes: row.missedNotes,
    maxCombo: row.maxCombo,
    fullCombo: row.fullCombo,
    hmd: 0,
    hasReplay: false,
    timeSet: row.timestamp.toISOString(),
    deviceHmd: "Quest 3",
    deviceControllerLeft: "Touch",
    deviceControllerRight: "Touch",
  };
}

const playerTokens = new Map<string, ScoreSaberV2PlayerToken>();
const playerPages = new Map<string, ScoreSaberV2PlayerToken[]>();
const playerScorePages = new Map<string, ScoreSaberPlayerScoresPageToken>();
let leaderboardScoresPage: ScoreSaberLeaderboardScoresPageToken | undefined;

async function prepareStubs(): Promise<void> {
  const { rows: accounts } = await pool.query(
    `SELECT a.id, a.name, a.country, a.pp, h.rank, h."countryRank"
     FROM "scoresaber-accounts" a LEFT JOIN "scoresaber-player-history" h
       ON h."playerId" = a.id AND h.date = current_date::timestamp AND h."realmId" = 1
     ORDER BY a.pp DESC LIMIT 3000`
  );
  accounts.forEach(
    (
      row: {
        id: string;
        name: string;
        country: string;
        pp: number;
        rank: number | null;
        countryRank: number | null;
      },
      i: number
    ) => {
      const token = buildScoreSaberV2PlayerToken({
        id: row.id,
        name: row.name,
        country: row.country,
        stats: {
          ...buildScoreSaberV2PlayerToken().stats,
          rank: row.rank ?? i + 1,
          countryRank: row.countryRank ?? i + 1,
          totalPP: row.pp,
        },
      });
      playerTokens.set(row.id, token);
    }
  );
  for (const id of [WHALE, PLAYER]) {
    if (!playerTokens.has(id)) {
      const { rows } = await pool.query(
        `SELECT id, name, country, pp FROM "scoresaber-accounts" WHERE id = $1`,
        [id]
      );
      playerTokens.set(
        id,
        buildScoreSaberV2PlayerToken({
          id,
          name: rows[0].name,
          country: rows[0].country,
          stats: { ...buildScoreSaberV2PlayerToken().stats, rank: 500, countryRank: 50, totalPP: rows[0].pp },
        })
      );
    }
  }
  const all = [...playerTokens.values()];
  playerPages.set("all", all);

  for (const id of [WHALE, PLAYER]) {
    const { rows } = await pool.query(
      `SELECT s."scoreId", s."playerId", s.score, s.accuracy, s."missedNotes", s."badCuts", s."maxCombo", s."fullCombo", s.timestamp,
              l.id AS lid, l."songHash", l."songName", l.difficulty, l."maxScore", coalesce(lr.ranked, false) AS ranked, coalesce(lr.stars, 0) AS stars, r.pp
       FROM "scoresaber-scores" s
       JOIN "scoresaber-leaderboards" l ON l.id = s."leaderboardId"
       LEFT JOIN "scoresaber-leaderboard-realms" lr ON lr."leaderboardId" = l.id AND lr."realmId" = 1
       LEFT JOIN "scoresaber-score-realms" r ON r."scoreId" = s."scoreId" AND r."realmId" = 1
       WHERE s."playerId" = $1 ORDER BY s.timestamp DESC LIMIT 8`,
      [id]
    );
    playerScorePages.set(id, {
      playerScores: rows.map((row: Record<string, unknown> & { scoreId: number }, i: number) => ({
        score: scoreToken({ ...(row as never), name: "n", rank: i + 1 }),
        leaderboard: leaderboardToken({
          id: row.lid as number,
          songHash: row.songHash as string,
          songName: row.songName as string,
          difficulty: row.difficulty as string,
          maxScore: row.maxScore as number,
          ranked: row.ranked as boolean,
          stars: row.stars as number,
        }),
      })),
      metadata: { total: id === WHALE ? 12000 : 57, page: 1, itemsPerPage: 8 },
    });
  }

  const { rows: lbScores } = await pool.query(
    `SELECT s."scoreId", s."playerId", a.name, s.score, s.accuracy, s."missedNotes", s."badCuts", s."maxCombo", s."fullCombo", s.timestamp, r.pp
     FROM "scoresaber-scores" s JOIN "scoresaber-accounts" a ON a.id = s."playerId"
     LEFT JOIN "scoresaber-score-realms" r ON r."scoreId" = s."scoreId" AND r."realmId" = 1
     WHERE s."leaderboardId" = $1 ORDER BY s.score DESC LIMIT 12`,
    [LEADERBOARD_ID]
  );
  leaderboardScoresPage = {
    scores: lbScores.map((row: Record<string, unknown>, i: number) =>
      scoreToken({ ...(row as never), rank: i + 1 })
    ),
    metadata: { total: 600, page: 1, itemsPerPage: 12 },
  };
}

function installStubs(): void {
  ScoreSaberApiService.lookupPlayer = async playerId => playerTokens.get(playerId);
  ScoreSaberApiService.lookupPlayers = async (page, options) => {
    const all = playerPages.get("all") ?? [];
    const filtered = options?.country ? all.filter(p => p.country === options.country) : all;
    const search = options?.search?.toLowerCase();
    const matched = search ? filtered.filter(p => p.name.toLowerCase().includes(search)) : filtered;
    const slice = matched.slice((page - 1) * 50, page * 50);
    return {
      data: slice.map(token => ({
        id: token.id,
        name: token.name,
        playerNameInGame: token.playerNameInGame,
        country: token.country,
        role: token.role,
        avatar: token.avatar,
        avatarVersion: token.avatarVersion,
        permissions: token.permissions,
        banned: token.banned,
        silenced: token.silenced,
        inactive: token.inactive,
        stats: token.stats,
      })),
      metadata: {
        page,
        itemsPerPage: 50,
        totalItems: matched.length,
        totalPages: Math.ceil(matched.length / 50),
      },
    } as never;
  };
  ScoreSaberApiService.lookupPlayerScores = async ({ playerId }) => playerScorePages.get(playerId);
  ScoreSaberApiService.lookupLeaderboardScores = async () => leaderboardScoresPage;
  ScoreSaberApiService.lookupRankingRequests = async () => undefined;
  BeatSaverService.getMap = async () => undefined;
}

interface RouteCase {
  name: string;
  method?: string;
  path: string;
  body?: unknown;
}

function buildRoutes(lb: SeedLeaderboard): RouteCase[] {
  const hash = lb.songHash;
  const diff = lb.difficulty;
  return [
    { name: "GET /", path: "/" },
    { name: "GET /health", path: "/health" },
    { name: "GET /statistics", path: "/statistics" },
    {
      name: "GET /beatleader/overlay-data/player/:playerId",
      path: `/beatleader/overlay-data/player/${WHALE}`,
    },
    {
      name: "GET /beatleader/overlay-data/player/:playerId/:hash/:difficulty/:characteristic",
      path: `/beatleader/overlay-data/player/${WHALE}/${hash}/${diff}/Standard`,
    },
    {
      name: "GET /beatleader/overlay-data/ratings/:hash/:difficulty/:characteristic",
      path: `/beatleader/overlay-data/ratings/${hash}/${diff}/Standard`,
    },
    { name: "GET /beatleader/overlay-data/:scoreId", path: "/beatleader/overlay-data/1" },
    { name: "GET /beatleader/scorestats/:scoreId", path: "/beatleader/scorestats/1" },
    {
      name: "GET /beatsaver/map/:hash/:difficulty/:characteristic",
      path: `/beatsaver/map/${hash}/${diff}/Standard`,
    },
    {
      name: "GET /leaderboard/by-hash/:hash/:difficulty/:characteristic",
      path: `/leaderboard/by-hash/${hash}/${diff}/Standard`,
    },
    { name: "GET /leaderboard/by-id/:leaderboardId", path: `/leaderboard/by-id/${lb.id}` },
    {
      name: "GET /leaderboard/by-id/:leaderboardId/star-history",
      path: `/leaderboard/by-id/${lb.id}/star-history`,
    },
    { name: "GET /leaderboard/ranking-queue", path: "/leaderboard/ranking-queue" },
    { name: "GET /leaderboard/search (text)", path: "/leaderboard/search?query=Song%20100&page=1" },
    {
      name: "GET /leaderboard/search (ranked)",
      path: "/leaderboard/search?ranked=true&category=date_ranked&page=1",
    },
    {
      name: "GET /leaderboard/search (ranked p100)",
      path: "/leaderboard/search?ranked=true&category=star_difficulty&page=100",
    },
    { name: "GET /player/history/:playerId", path: `/player/history/${WHALE}` },
    { name: "GET /player/mini-ranking/:playerId", path: `/player/mini-ranking/${WHALE}` },
    { name: "GET /player/:playerId (basic)", path: `/player/${WHALE}?type=basic` },
    { name: "GET /player/:playerId (full)", path: `/player/${WHALE}?type=full` },
    { name: "GET /player/:playerId/followers", path: `/player/${WHALE}/followers` },
    { name: "GET /player/:playerId/following", path: `/player/${WHALE}/following` },
    { name: "GET /player/:playerId/follows", path: `/player/${WHALE}/follows` },
    { name: "GET /player/:playerId/pinned-scores", path: `/player/${WHALE}/pinned-scores` },
    { name: "GET /player/pps/:playerId", path: `/player/pps/${WHALE}` },
    {
      name: "GET /player/score-history/:playerId/:leaderboardId/:page",
      path: `/player/score-history/${WHALE}/1/1`,
    },
    { name: "GET /player/scores-chart/:playerId", path: `/player/scores-chart/${WHALE}` },
    { name: "GET /player/search", path: "/player/search?query=Alpha" },
    { name: "GET /playlist/scoresaber-ranked-maps", path: "/playlist/scoresaber-ranked-maps" },
    { name: "GET /playlist/scoresaber-ranked-maps.bplist", path: "/playlist/scoresaber-ranked-maps.bplist" },
    { name: "GET /playlist/scoresaber-qualified-maps", path: "/playlist/scoresaber-qualified-maps" },
    { name: "GET /playlist/scoresaber-ranking-queue-maps", path: "/playlist/scoresaber-ranking-queue-maps" },
    { name: "GET /playlist/scoresaber-trending", path: "/playlist/scoresaber-trending" },
    { name: "GET /playlist/reweight/:reweightId", path: "/playlist/reweight/1" },
    { name: "GET /playlist/self", path: `/playlist/self?user=${WHALE}` },
    { name: "GET /playlist/snipe", path: `/playlist/snipe?user=${WHALE}&toSnipe=${PLAYER}` },
    { name: "GET /ranking/:page", path: "/ranking/1" },
    { name: "GET /ranking/medals/:page", path: "/ranking/medals/1" },
    { name: "GET /reweights/", path: "/reweights/" },
    { name: "GET /reweights/markers", path: "/reweights/markers" },
    { name: "GET /reweights/player/:playerId", path: `/reweights/player/${WHALE}` },
    {
      name: "GET /reweights/player/:playerId/:reweightId/scores",
      path: `/reweights/player/${WHALE}/1/scores`,
    },
    { name: "GET /reweights/:reweightId", path: "/reweights/1" },
    { name: "GET /reweights/:reweightId/players", path: "/reweights/1/players" },
    { name: "GET /scores/history-graph/:playerId/:leaderboardId", path: `/scores/history-graph/${WHALE}/1` },
    { name: "GET /scores/leaderboard/:leaderboardId/:page", path: `/scores/leaderboard/${lb.id}/1` },
    { name: "GET /scores/player/accsaber/:playerId/:page", path: `/scores/player/accsaber/${WHALE}/1` },
    {
      name: "GET /scores/player/medals/:playerId/:field/:direction/:page",
      path: `/scores/player/medals/${WHALE}/medals/desc/1`,
    },
    {
      name: "GET /scores/player/scoresaber/:playerId/:sort/:page",
      path: `/scores/player/scoresaber/${WHALE}/recent/1`,
    },
    {
      name: "GET /scores/player/ssr/:playerId/:field/:direction/:page",
      path: `/scores/player/ssr/${WHALE}/pp/desc/1`,
    },
    { name: "GET /scores/:scoreId", path: "/scores/10000001" },
    { name: "GET /scores/top/:page (1)", path: "/scores/top/1" },
    { name: "GET /scores/top/:page (1000)", path: "/scores/top/1000" },
    {
      name: "POST /scores/following/leaderboard/:leaderboardId/:page",
      method: "POST",
      path: `/scores/following/leaderboard/${lb.id}/1`,
      body: { followingIds: [WHALE, PLAYER, "76561198000000011", "76561198000000012"] },
    },
  ];
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

new MetricsService();
new StorageService();
await prepareStubs();
installStubs();
const app = createTestApp();
installStubs(); // createTestApp re-patches the API; re-assert the seeded stubs

const lb = await loadSeedLeaderboard(LEADERBOARD_ID);
const results: { name: string; status: number; median: number; p95: number; bytes: number }[] = [];

const NETWORK_BOUND = ["/beatleader/", "/player/search", "/beatsaver/"];
const isNetworkBound = (route: RouteCase): boolean =>
  NETWORK_BOUND.some(prefix => route.path.startsWith(prefix));
const ordered = [...buildRoutes(lb)].sort((a, b) => Number(isNetworkBound(a)) - Number(isNetworkBound(b)));

for (const route of ordered) {
  if (filter && !route.name.includes(filter)) {
    continue;
  }
  if (isNetworkBound(route) && !process.env.BENCH_NET) {
    continue; // upstream-bound: only meaningful against real upstream latency
  }
  const init: RequestInit = route.body
    ? {
        method: route.method ?? "POST",
        body: JSON.stringify(route.body),
        headers: { "content-type": "application/json" },
      }
    : { method: route.method ?? "GET" };
  const times: number[] = [];
  let status = 0;
  let bytes = 0;
  for (let i = 0; i < ITERATIONS + WARMUP; i++) {
    const start = performance.now();
    const res = await request(app, route.path, init);
    const text = await res.text();
    const elapsed = performance.now() - start;
    status = res.status;
    bytes = text.length;
    if (i === 0 && process.env.BENCH_DUMP) {
      mkdirSync(process.env.BENCH_DUMP, { recursive: true });
      writeFileSync(`${process.env.BENCH_DUMP}/${route.name.replace(/[^a-zA-Z0-9]+/g, "_")}.json`, text);
    }
    if (i === 0 && status >= 400) {
      console.log(`   ! ${route.name} -> ${status} ${text.slice(0, 160)}`);
    }
    if (i >= WARMUP) {
      times.push(elapsed);
    }
  }
  times.sort((a, b) => a - b);
  const row = {
    name: route.name,
    status,
    median: percentile(times, 0.5),
    p95: percentile(times, 0.95),
    bytes,
  };
  results.push(row);
  console.log(
    `${String(row.status).padEnd(4)} ${row.name.padEnd(68)} median ${row.median.toFixed(1).padStart(8)} ms  p95 ${row.p95.toFixed(1).padStart(8)} ms  ${String(row.bytes).padStart(8)} B`
  );
}

writeFileSync(`/tmp/bench-${label}.json`, JSON.stringify(results, null, 2));
await pool.end();
process.exit(0);
