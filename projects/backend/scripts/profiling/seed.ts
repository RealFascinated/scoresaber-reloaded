import "./env";
import { Client } from "pg";
import { runMigrations } from "../../src/db/run-migrations";
import { COUNTRIES, LEADERBOARDS, PLAYER_ID_BASE, PLAYERS, SCORE_ID_STRIDE } from "./fake-data";

const GRINDERS = Number(process.env.FAKE_GRINDERS ?? 200);
const HISTORY_PLAYERS = Number(process.env.FAKE_HISTORY_PLAYERS ?? 20_000);
const HISTORY_DAYS = Number(process.env.FAKE_HISTORY_DAYS ?? 60);
const SCORE_EVENTS = Number(process.env.FAKE_SCORE_EVENTS ?? 300_000);
const RANKED_BATCHES = 6;

const countries = `ARRAY[${COUNTRIES.map(country => `'${country}'`).join(",")}]`;
const playerIdSql = (index: string) => `(${PLAYER_ID_BASE}::bigint + ${index})::text`;
const songIndexSql = (id: string) => `ceil(${id} / 4.0)::int`;
const songHashSql = (id: string) =>
  `upper(substr(encode(sha256(convert_to('song-' || ${songIndexSql(id)}, 'UTF8')), 'hex'), 1, 40))`;

const tables = [
  "scoresaber-score-events",
  "scoresaber-ranked-batch-scores",
  "scoresaber-ranked-batch-players",
  "scoresaber-ranked-batch-new-leaderboards",
  "scoresaber-ranked-batch-leaderboards",
  "scoresaber-ranked-batches",
  "scoresaber-player-history",
  "scoresaber-score-history",
  "scoresaber-score-realms",
  "scoresaber-scores",
  "scoresaber-leaderboard-suggested-maps",
  "scoresaber-leaderboard-realms",
  "scoresaber-leaderboards",
  "scoresaber-account-names",
  "scoresaber-accounts",
  "beatleader-scores",
  "beatleader-players",
  "beatsaver-map-difficulties",
  "beatsaver-map-versions",
  "beatsaver-maps",
  "beatsaver-uploaders",
];

const steps: [string, string][] = [
  ["truncate", `TRUNCATE ${tables.map(table => `"${table}"`).join(", ")} RESTART IDENTITY CASCADE`],
  [
    "accounts",
    `INSERT INTO "scoresaber-accounts" (id, name, country, avatar, "peakRank", "peakRankTimestamp", "seededScores",
       "seededBeatLeaderScores", "trackReplays", inactive, banned, hmd, pp, "currentStreak", "longestStreak",
       "lastPlayedDate", "trackedSince", "joinedDate")
     SELECT ${playerIdSql("i")}, 'Player' || i, (${countries})[i % ${COUNTRIES.length} + 1],
       'https://cdn.example.com/avatar/' || i || '.jpg', greatest(1, i - 50), now() - (i % 900) * interval '1 day',
       true, true, i <= 1000, i % 10 = 0, i % 997 = 0,
       (ARRAY['Quest 3','Valve Index','Quest 2','PICO 4','Quest 3S','Bigscreen Beyond'])[i % 6 + 1],
       round((20000 * exp(-i / (${PLAYERS} / 8.0)))::numeric, 2), i % 40, i % 120,
       (current_date - (i % 5))::date, now() - (i % 1500) * interval '1 day', now() - (i % 3000) * interval '1 day'
     FROM generate_series(1, ${PLAYERS}) i`,
  ],
  [
    "leaderboards",
    `INSERT INTO "scoresaber-leaderboards" (id, "songHash", "songName", "songSubName", "songAuthorName",
       "levelAuthorName", difficulty, characteristic, "maxScore", plays, "dailyPlays", "seededScores",
       "trendingScore", timestamp)
     SELECT id, ${songHashSql("id")}, 'Song ' || ${songIndexSql("id")}, '', 'Artist ' || (${songIndexSql("id")} % 500),
       'Mapper ' || (${songIndexSql("id")} % 300), (ARRAY['Normal','Hard','Expert','ExpertPlus'])[(id - 1) % 4 + 1],
       'Standard', 500000 + (id::bigint * 7919) % 1500000,
       floor(1000 * exp(-id / (${LEADERBOARDS} / 5.0)))::int + 20,
       (floor(1000 * exp(-id / (${LEADERBOARDS} / 5.0)))::int + 20) / 30, true,
       (id * 7) % 1000 / 10.0, now() - (id % 2000) * interval '1 day'
     FROM generate_series(1, ${LEADERBOARDS}) id`,
  ],
  [
    "leaderboard realms",
    `INSERT INTO "scoresaber-leaderboard-realms" ("leaderboardId", "realmId", ranked, qualified, stars, "rankedDate",
       "qualifiedDate")
     SELECT id, 1, id % 3 <> 0, id % 3 = 0, CASE WHEN id % 3 <> 0 THEN 1 + (id * 37) % 1300 / 100.0 ELSE 0 END,
       CASE WHEN id % 3 <> 0 THEN now() - (id % 1000) * interval '1 day' END,
       now() - (id % 1000 + 7) * interval '1 day'
     FROM generate_series(1, ${LEADERBOARDS}) id
     WHERE id % 3 <> 0 OR id % 21 = 0`,
  ],
  [
    "scores",
    `INSERT INTO "scoresaber-scores" ("scoreId", "playerId", "leaderboardId", difficulty, characteristic, score,
       accuracy, medals, "missedNotes", "badCuts", "maxCombo", "fullCombo", modifiers, hmd, "rightController",
       "leftController", timestamp)
     SELECT l.id * ${SCORE_ID_STRIDE} + r, ${playerIdSql(`((l.id::bigint * 7919 + r::bigint * 104729) % ${PLAYERS}) + 1`)},
       l.id, l.difficulty, l.characteristic, floor(l."maxScore" * (0.99 - r * 0.00015))::int, 99 - r * 0.015,
       CASE WHEN l.id % 3 <> 0 AND r <= 10 THEN 11 - r ELSE 0 END, r % 5, r % 3, 500 + l.id % 300, r % 7 = 0,
       CASE WHEN r % 11 = 0 THEN ARRAY['FS'] ELSE ARRAY[]::varchar[] END, 'Quest 3', 'Touch', 'Touch',
       now() - ((l.id * 13 + r * 17) % 8760) * interval '1 hour'
     FROM "scoresaber-leaderboards" l CROSS JOIN LATERAL generate_series(1, l.plays) r
     ON CONFLICT DO NOTHING`,
  ],
  [
    "grinder scores",
    `INSERT INTO "scoresaber-scores" ("scoreId", "playerId", "leaderboardId", difficulty, characteristic, score,
       accuracy, medals, "missedNotes", "badCuts", "maxCombo", "fullCombo", modifiers, hmd, "rightController",
       "leftController", timestamp)
     SELECT l.id * ${SCORE_ID_STRIDE} + 5000 + g, ${playerIdSql("g")}, l.id, l.difficulty, l.characteristic,
       floor(l."maxScore" * (0.97 - g * 0.0001))::int, 97 - g * 0.01, 0, g % 5, g % 3, 500, false,
       ARRAY[]::varchar[], 'Valve Index', 'Knuckles', 'Knuckles',
       now() - ((l.id * 31 + g * 7) % 17520) * interval '1 hour'
     FROM generate_series(1, ${GRINDERS}) g
     JOIN "scoresaber-leaderboards" l ON l.id % 4 = g % 4
     ON CONFLICT DO NOTHING`,
  ],
  [
    "score realms",
    `INSERT INTO "scoresaber-score-realms" ("scoreId", "realmId", "playerId", "leaderboardId", pp)
     SELECT s."scoreId", 1, s."playerId", s."leaderboardId", lr.stars * 0.42 * s.accuracy
     FROM "scoresaber-scores" s
     JOIN "scoresaber-leaderboard-realms" lr ON lr."leaderboardId" = s."leaderboardId" AND lr."realmId" = 1 AND lr.ranked`,
  ],
  [
    "account medals",
    `UPDATE "scoresaber-accounts" a SET medals = m.total
     FROM (SELECT "playerId", sum(medals)::int total FROM "scoresaber-scores" WHERE medals > 0 GROUP BY "playerId") m
     WHERE a.id = m."playerId"`,
  ],
  [
    "account medal ranks",
    `UPDATE "scoresaber-accounts" a SET "medalsRank" = r.global, "medalsCountryRank" = r.local
     FROM (SELECT id, rank() OVER (ORDER BY medals DESC, id) global,
             rank() OVER (PARTITION BY country ORDER BY medals DESC, id) local
           FROM "scoresaber-accounts" WHERE medals > 0 AND NOT banned AND country IS NOT NULL AND country <> '') r
     WHERE a.id = r.id`,
  ],
  [
    "score history",
    `INSERT INTO "scoresaber-score-history" ("playerId", "leaderboardId", "scoreId", difficulty, characteristic, score,
       accuracy, pp, medals, "missedNotes", "badCuts", "maxCombo", "fullCombo", modifiers, hmd, "rightController",
       "leftController", timestamp)
     SELECT s."playerId", s."leaderboardId", s."scoreId", s.difficulty, s.characteristic, s.score - 5000 * k,
       s.accuracy - 0.5 * k, coalesce(sr.pp, 0) * 0.98, 0, s."missedNotes" + k, s."badCuts", s."maxCombo", false,
       s.modifiers, s.hmd, s."rightController", s."leftController", s.timestamp - k * interval '7 days'
     FROM "scoresaber-scores" s
     LEFT JOIN "scoresaber-score-realms" sr ON sr."scoreId" = s."scoreId" AND sr."realmId" = 1
     CROSS JOIN generate_series(1, 3) k
     WHERE s."scoreId" % 4 = 0 AND k <= 1 + s."scoreId" % 3
     ON CONFLICT DO NOTHING`,
  ],
  [
    "player history",
    `INSERT INTO "scoresaber-player-history" ("playerId", date, "realmId", rank, "countryRank", medals, pp, "plusOnePp",
       "totalScore", "totalRankedScore", "rankedScores", "unrankedScores", "rankedScoresImproved",
       "unrankedScoresImproved", "totalRankedScores", "totalUnrankedScores", "totalScores", "averageRankedAccuracy",
       "averageUnrankedAccuracy", "averageAccuracy", "aPlays", "sPlays", "spPlays", "ssPlays", "sspPlays", "godPlays")
     SELECT ${playerIdSql("i")}, date_trunc('day', now()) - d * interval '1 day', 1, i + d % 7, ceil(i / 16.0)::int + d % 3,
       i % 40, 20000 * exp(-i / (${PLAYERS} / 8.0)) - d * 1.5, 0.5, 1e8 - d * 1e5, 9e7 - d * 1e5, d % 9, d % 4, d % 5,
       d % 2, 500 - d, 200 - d, 700 - 2 * d, 0.95, 0.93, 0.94, 10, 200, 150, 50, 10, 1
     FROM generate_series(1, ${HISTORY_PLAYERS}) i CROSS JOIN generate_series(0, ${HISTORY_DAYS - 1}) d`,
  ],
  [
    "beatleader players",
    `INSERT INTO "beatleader-players" (id, name, platform, "steamId", "lastFetched")
     SELECT ${playerIdSql("i")}, 'Player' || i, 'steam', ${playerIdSql("i")}, now()
     FROM generate_series(1, ${PLAYERS}) i WHERE i % 2 = 0`,
  ],
  [
    "beatleader scores",
    `INSERT INTO "beatleader-scores" (id, "playerId", "songHash", "leaderboardId", "songDifficulty",
       "songCharacteristic", "songScore", pauses, "fcAccuracy", "fullCombo", "savedReplay", "leftHandAccuracy",
       "rightHandAccuracy", misses, "missedNotes", "bombCuts", "wallsHit", "badCuts", "improvementScore",
       "improvementPauses", "improvementMisses", "improvementMissedNotes", "improvementBombCuts",
       "improvementWallsHit", "improvementBadCuts", "improvementLeftHandAccuracy", "improvementRightHandAccuracy",
       timestamp)
     SELECT s."scoreId", s."playerId", l."songHash", l.id || 'x' || (s."leaderboardId" % 4), s.difficulty,
       s.characteristic, s.score, s."scoreId" % 3, least(1, s.accuracy / 100 + 0.01), s."fullCombo", s."scoreId" % 2 = 0,
       114.2, 114.6, s."missedNotes" + s."badCuts", s."missedNotes", 0, 0, s."badCuts", 1200, 0, -1, -1, 0, 0, 0,
       0.1, 0.12, s.timestamp
     FROM "scoresaber-scores" s JOIN "scoresaber-leaderboards" l ON l.id = s."leaderboardId"
     WHERE s."scoreId" % 3 <> 0`,
  ],
  [
    "beatsaver uploaders",
    `INSERT INTO "beatsaver-uploaders" (id, name, hash, avatar, type, admin, curator, "seniorCurator",
       "verifiedMapper", "playlistUrl")
     SELECT u, 'Mapper ' || u, md5(u::text), 'https://cdn.example.com/mapper/' || u || '.jpg', 'SIMPLE', false,
       u % 50 = 0, false, u % 5 = 0, ''
     FROM generate_series(0, 299) u`,
  ],
  [
    "beatsaver maps",
    `INSERT INTO "beatsaver-maps" (id, name, description, "uploaderId", bpm, duration, "songName", "songSubName",
       "songAuthorName", "songAuthorUrl", "levelAuthorName", "uploadedAt", automapper, "createdAt", "updatedAt",
       "lastPublishedAt", tags)
     SELECT to_hex(s + 4096), 'Song ' || s, 'Fake map ' || s, s % 300, 120 + s % 100, 120 + s % 240, 'Song ' || s,
       '', 'Artist ' || (s % 500), '', 'Mapper ' || (s % 300), now() - (s % 2000) * interval '1 day', false,
       now() - (s % 2000) * interval '1 day', now(), now() - (s % 2000) * interval '1 day', ARRAY['tech','dance']
     FROM generate_series(1, ${Math.ceil(LEADERBOARDS / 4)}) s`,
  ],
  [
    "beatsaver versions",
    `INSERT INTO "beatsaver-map-versions" ("mapId", hash, stage, "createdAt", "downloadUrl", "coverUrl", "previewUrl")
     SELECT to_hex(s + 4096), lower(${songHashSql("s * 4")}), 'Published', now() - (s % 2000) * interval '1 day',
       'https://cdn.example.com/' || s || '.zip', 'https://cdn.example.com/' || s || '.jpg',
       'https://cdn.example.com/' || s || '.mp3'
     FROM generate_series(1, ${Math.ceil(LEADERBOARDS / 4)}) s`,
  ],
  [
    "beatsaver difficulties",
    `INSERT INTO "beatsaver-map-difficulties" ("versionId", characteristic, difficulty, njs, "offset", notes, bombs,
       obstacles, nps, length, events, chroma, "mappingExtensions", "noodleExtensions", cinema, seconds, "maxScore",
       label)
     SELECT v.id, 'Standard', d, 16 + v.id % 6, 0, 500 + v.id % 900, 10, 20, 4 + (v.id % 70) / 10.0, 300, 1000,
       false, false, false, false, 180, 500000 + v.id % 1000000, d
     FROM "beatsaver-map-versions" v CROSS JOIN unnest(ARRAY['Normal','Hard','Expert','ExpertPlus']) d`,
  ],
  [
    "score events",
    `INSERT INTO "scoresaber-score-events" ("playerId", "leaderboardId", timestamp)
     SELECT ${playerIdSql(`(e::bigint * 7919) % ${PLAYERS} + 1`)}, (e::bigint * 104729) % ${LEADERBOARDS} + 1,
       now() - (e % 604800) * interval '1 second'
     FROM generate_series(1, ${SCORE_EVENTS}) e`,
  ],
  [
    "ranked batches",
    `INSERT INTO "scoresaber-ranked-batches" ("realmId", "startedAt", "endedAt", "leaderboardCount",
       "newLeaderboardCount", "playerCount", "scoreCount", "notifiedAt")
     SELECT 1, now() - b * interval '30 days', now() - b * interval '30 days' + interval '2 days', 500, 100, 5000,
       50000, now() - b * interval '30 days' + interval '3 days'
     FROM generate_series(1, ${RANKED_BATCHES}) b`,
  ],
  [
    "ranked batch star changes",
    `INSERT INTO "scoresaber-ranked-batch-leaderboards" ("leaderboardId", "realmId", "previousStars", "newStars",
       timestamp, "rankedBatchId", "ppPending")
     SELECT lr."leaderboardId", 1, lr.stars - 0.3, lr.stars, b."startedAt", b.id, false
     FROM "scoresaber-ranked-batches" b JOIN "scoresaber-leaderboard-realms" lr
       ON lr.ranked AND lr."leaderboardId" % ${RANKED_BATCHES} = b.id - 1 AND lr."leaderboardId" % 9 = 1`,
  ],
  [
    "ranked batch new leaderboards",
    `INSERT INTO "scoresaber-ranked-batch-new-leaderboards" ("rankedBatchId", "leaderboardId", stars, timestamp)
     SELECT b.id, lr."leaderboardId", lr.stars, b."startedAt"
     FROM "scoresaber-ranked-batches" b JOIN "scoresaber-leaderboard-realms" lr
       ON lr.ranked AND lr."leaderboardId" % ${RANKED_BATCHES} = b.id - 1 AND lr."leaderboardId" % 9 = 2`,
  ],
  [
    "ranked batch scores",
    `INSERT INTO "scoresaber-ranked-batch-scores" ("rankedBatchId", "scoreId", "playerId", "leaderboardId",
       "ppBefore", "ppAfter")
     SELECT c."rankedBatchId", sr."scoreId", sr."playerId", sr."leaderboardId", sr.pp * 0.97, sr.pp
     FROM "scoresaber-ranked-batch-leaderboards" c
     JOIN "scoresaber-score-realms" sr ON sr."realmId" = 1 AND sr."leaderboardId" = c."leaderboardId"`,
  ],
  [
    "ranked batch players",
    `INSERT INTO "scoresaber-ranked-batch-players" ("rankedBatchId", "playerId", "ppBefore", "ppAfter", "ppDelta",
       "scoresChanged")
     SELECT bs."rankedBatchId", bs."playerId", a.pp - sum(bs."ppAfter" - bs."ppBefore"), a.pp,
       sum(bs."ppAfter" - bs."ppBefore"), count(*)
     FROM "scoresaber-ranked-batch-scores" bs JOIN "scoresaber-accounts" a ON a.id = bs."playerId"
     GROUP BY bs."rankedBatchId", bs."playerId", a.pp`,
  ],
  [
    "table counts",
    `UPDATE "ssr_table_counts" SET
       "scoresaberScores" = (SELECT count(*) FROM "scoresaber-scores"),
       "scoresaberScoreHistory" = (SELECT count(*) FROM "scoresaber-score-history"),
       "scoresaberAccounts" = (SELECT count(*) FROM "scoresaber-accounts"),
       "scoresaberInactiveAccounts" = (SELECT count(*) FROM "scoresaber-accounts" WHERE inactive),
       "scoresaberLeaderboards" = (SELECT count(*) FROM "scoresaber-leaderboards"),
       "refreshedAt" = now()
     WHERE id = 1`,
  ],
];

await runMigrations();
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query("SET synchronous_commit = off");
await client.query("SET maintenance_work_mem = '1GB'");
await client.query("SET work_mem = '256MB'");

const seedStartedAt = performance.now();
const resumeIndex = process.env.SEED_FROM ? steps.findIndex(([name]) => name === process.env.SEED_FROM) : 0;
if (resumeIndex < 0) {
  throw new Error(
    `Unknown SEED_FROM step "${process.env.SEED_FROM}", expected one of: ${steps.map(([name]) => name).join(", ")}`
  );
}
for (const [name, statement] of steps.slice(resumeIndex)) {
  const startedAt = performance.now();
  const result = await client.query(statement);
  console.log(
    `${name.padEnd(32)} ${String(result.rowCount ?? 0).padStart(10)} rows ${((performance.now() - startedAt) / 1000).toFixed(1)}s`
  );
}
for (const table of tables) {
  await client.query(`VACUUM ANALYZE "${table}"`);
}
console.log(`seeded in ${((performance.now() - seedStartedAt) / 1000).toFixed(1)}s`);
await client.end();
process.exit(0);
