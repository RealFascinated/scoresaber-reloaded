-- Bench seed: ~40k players, 25k leaderboards (8k ranked), 2M scores, 600k BeatLeader scores,
-- 600k score history rows, 1.8M player history rows. Run against an isolated database only.
TRUNCATE "scoresaber-accounts", "scoresaber-leaderboards", "scoresaber-leaderboard-realms", "scoresaber-scores",
  "scoresaber-score-realms", "scoresaber-score-history", "beatleader-scores", "scoresaber-player-history",
  "scoresaber-reweight-leaderboards" RESTART IDENTITY CASCADE;

INSERT INTO "scoresaber-accounts" (id, avatar, name, country, "seededScores", "seededBeatLeaderScores", "trackReplays", inactive, banned,
  hmd, pp, medals, "trackedSince", "joinedDate")
SELECT (76561198000000000 + g)::text, 'https://cdn.example/a.png',
       (ARRAY['Alpha','Bravo','Charlie','Delta','Echo','Foxtrot','Golf','Hotel'])[1 + g % 8] || ' ' || md5(g::text),
       (ARRAY['US','GB','DE','FR','JP','PL','BR','NL','CA','AU'])[1 + g % 10],
       true, g % 3 = 0, g % 5 = 0, g % 20 = 0, false,
       'Unknown', 20000 - (g::float / 40000) * 19000, g % 50, now() - interval '400 days', now() - interval '900 days'
FROM generate_series(1, 40000) g;

INSERT INTO "scoresaber-leaderboards" (id, "songHash", "songName", "songSubName", "songAuthorName", "levelAuthorName",
  difficulty, characteristic, "maxScore", plays, "dailyPlays", "seededScores", "trendingScore", timestamp)
SELECT g, upper(md5('song' || (g / 5)::text)), 'Song ' || g, '', 'Artist ' || (g % 900), 'Mapper ' || (g % 400),
       (ARRAY['Easy','Normal','Hard','Expert','ExpertPlus'])[1 + g % 5], 'Standard', 800000,
       (random() * 50000)::int, (random() * 300)::int, true, random() * 100, now() - (g || ' minutes')::interval
FROM generate_series(1, 25000) g;

INSERT INTO "scoresaber-leaderboard-realms" ("leaderboardId", "realmId", ranked, qualified, stars, "rankedDate")
SELECT g, 1, true, false, 1 + random() * 13, now() - (g || ' hours')::interval
FROM generate_series(1, 25000, 3) g;

-- 2M scores: each player has ~50 scores; leaderboards get ~80 each on average (skewed toward low ids).
INSERT INTO "scoresaber-scores" ("scoreId", "playerId", "leaderboardId", difficulty, characteristic, score, accuracy, medals,
  "missedNotes", "badCuts", "maxCombo", "fullCombo", hmd, timestamp)
SELECT row_number() OVER (), pid, lid, l.difficulty, 'Standard', (400000 + random() * 400000)::int, 70 + random() * 30, 0,
       (random() * 5)::int, (random() * 2)::int, 500, random() < 0.3, 'Unknown', now() - (random() * 900 || ' days')::interval
FROM (
  SELECT DISTINCT (76561198000000000 + 1 + (random() * 39999)::int)::text AS pid,
         1 + (power(random(), 1.8) * 24999)::int AS lid
  FROM generate_series(1, 2300000)
) s JOIN "scoresaber-leaderboards" l ON l.id = s.lid;

INSERT INTO "scoresaber-score-realms" ("scoreId", "realmId", "playerId", "leaderboardId", pp)
SELECT s."scoreId", 1, s."playerId", s."leaderboardId", 50 + random() * 400
FROM "scoresaber-scores" s JOIN "scoresaber-leaderboard-realms" r ON r."leaderboardId" = s."leaderboardId" AND r."realmId" = 1;

INSERT INTO "scoresaber-score-history" ("playerId", "leaderboardId", "scoreId", difficulty, characteristic, score, accuracy, pp,
  "missedNotes", "badCuts", "maxCombo", "fullCombo", hmd, timestamp)
SELECT "playerId", "leaderboardId", "scoreId", difficulty, characteristic, score - 5000 - (random() * 10000)::int, accuracy - 1, 0,
       "missedNotes" + 1, "badCuts", "maxCombo", false, 'Unknown', timestamp - interval '3 days'
FROM "scoresaber-scores" WHERE "scoreId" % 3 = 0;

INSERT INTO "beatleader-scores" (id, "playerId", "songHash", "leaderboardId", "songDifficulty", "songCharacteristic", "songScore",
  pauses, "fcAccuracy", "fullCombo", "savedReplay", "leftHandAccuracy", "rightHandAccuracy", misses, "missedNotes", "bombCuts",
  "wallsHit", "badCuts", "improvementScore", "improvementPauses", "improvementMisses", "improvementMissedNotes",
  "improvementBombCuts", "improvementWallsHit", "improvementBadCuts", "improvementLeftHandAccuracy",
  "improvementRightHandAccuracy", timestamp)
SELECT s."scoreId", s."playerId", l."songHash", s."leaderboardId"::text, s.difficulty, 'Standard', s.score,
       0, s.accuracy, s."fullCombo", false, 90, 90, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, s.timestamp
FROM "scoresaber-scores" s JOIN "scoresaber-leaderboards" l ON l.id = s."leaderboardId" WHERE s."scoreId" % 3 = 1;

INSERT INTO "scoresaber-player-history" ("playerId", date, "realmId", rank, "countryRank", medals, pp, "totalScore", "totalRankedScore",
  "rankedScores", "unrankedScores", "totalScores", "averageAccuracy")
SELECT (76561198000000000 + p)::text, (current_date - d)::timestamp, 1, p, 1 + p / 10, 0, 20000 - p * 0.4, 1e9, 5e8, 100, 400, 500, 90
FROM generate_series(1, 40000) p, generate_series(0, 44) d;

INSERT INTO "scoresaber-reweight-leaderboards" ("leaderboardId", "realmId", "previousStars", "newStars", timestamp, "ppPending")
SELECT 1 + (g * 3) % 25000, 1, 5, 5.5, now() - (g || ' hours')::interval, false FROM generate_series(1, 2000) g;

VACUUM ANALYZE;

-- A heavy player (12k scores, ~half ranked) to expose per-player aggregate costs.
INSERT INTO "scoresaber-accounts" (id, name, avatar, country, "seededScores", "seededBeatLeaderScores", "trackReplays", inactive, banned, hmd, pp, medals, "trackedSince", "joinedDate")
VALUES ('76561198099999999', 'Whale', 'https://cdn.example/a.png', 'US', true, true, true, false, false, 'Unknown', 30000, 10, now() - interval '400 days', now() - interval '900 days') ON CONFLICT DO NOTHING;
INSERT INTO "scoresaber-scores" ("scoreId", "playerId", "leaderboardId", difficulty, characteristic, score, accuracy, medals, "missedNotes", "badCuts", "maxCombo", "fullCombo", hmd, timestamp)
SELECT 10000000 + l.id, '76561198099999999', l.id, l.difficulty, 'Standard', (400000 + random() * 400000)::int, 70 + random() * 30, 0, 0, 0, 500, true,
       (ARRAY['Quest 3','Index','Quest 2','Unknown'])[1 + l.id % 4], now() - (random() * 900 || ' days')::interval
FROM "scoresaber-leaderboards" l WHERE l.id <= 12000 ON CONFLICT DO NOTHING;
INSERT INTO "scoresaber-score-realms" ("scoreId", "realmId", "playerId", "leaderboardId", pp)
SELECT s."scoreId", 1, s."playerId", s."leaderboardId", 50 + random() * 400
FROM "scoresaber-scores" s JOIN "scoresaber-leaderboard-realms" r ON r."leaderboardId" = s."leaderboardId" AND r."realmId" = 1
WHERE s."playerId" = '76561198099999999' ON CONFLICT DO NOTHING;
ANALYZE;

-- One reweight covering every seeded star change, with 8k players and the whale's changed scores.
INSERT INTO "scoresaber-reweights" (id, "realmId", "startedAt", "endedAt", "leaderboardCount", "playerCount", "scoreCount")
VALUES (1, 1, now() - interval '10 days', now() - interval '8 days', 2000, 8000, 60000) ON CONFLICT DO NOTHING;
UPDATE "scoresaber-reweight-leaderboards" SET "reweightId" = 1;
INSERT INTO "scoresaber-reweight-players" ("reweightId", "playerId", "ppBefore", "ppAfter", "ppDelta", "scoresChanged")
SELECT 1, id, pp, pp - (random() * 50), -(random() * 50), 10 FROM "scoresaber-accounts" ORDER BY id LIMIT 8000 ON CONFLICT DO NOTHING;
INSERT INTO "scoresaber-reweight-players" ("reweightId", "playerId", "ppBefore", "ppAfter", "ppDelta", "scoresChanged")
VALUES (1, '76561198099999999', 30000, 29800, -200, 3000) ON CONFLICT DO NOTHING;
INSERT INTO "scoresaber-reweight-scores" ("reweightId", "scoreId", "playerId", "leaderboardId", "ppBefore", "ppAfter")
SELECT 1, "scoreId", "playerId", "leaderboardId", pp, pp - 5 FROM "scoresaber-score-realms" WHERE "playerId" = '76561198099999999' ON CONFLICT DO NOTHING;
ANALYZE;
