import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import type { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import type { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import {
  SUGGESTED_MAPS_FEATURE_COUNT,
  accuracyToLogit,
  buildMapFeatures,
  scoreWeight,
  type SuggestedMapsParams,
} from "@ssr/common/suggested-maps/suggested-maps-model";
import { sql } from "drizzle-orm";
import { db } from "../../db";

const FETCH_SIZE = 20_000;

type RankedMapRow = {
  id: number;
  songHash: string;
  songName: string;
  songSubName: string;
  songAuthorName: string;
  levelAuthorName: string;
  difficulty: MapDifficulty;
  characteristic: MapCharacteristic;
  stars: number;
  seconds: number | null;
  nps: number | null;
};

type ScoreRow = {
  playerId: string;
  leaderboardId: number;
  accuracy: number;
  ageDays: number;
  errors: number;
  fullCombo: boolean;
};

/**
 * Lists every ranked map of the default realm with its BeatSaver length / density.
 */
export async function listRankedMaps() {
  const result = await db.execute<RankedMapRow>(sql`
    SELECT DISTINCT ON (l.id)
      l.id,
      l."songHash",
      l."songName",
      l."songSubName",
      l."songAuthorName",
      l."levelAuthorName",
      l.difficulty,
      l.characteristic,
      lr.stars,
      d.seconds,
      d.nps
    FROM "scoresaber-leaderboards" l
    JOIN "scoresaber-leaderboard-realms" lr
      ON lr."leaderboardId" = l.id AND lr."realmId" = ${DEFAULT_REALM_ID} AND lr.ranked
    LEFT JOIN "beatsaver-map-versions" v ON lower(v.hash) = lower(l."songHash")
    LEFT JOIN "beatsaver-map-difficulties" d
      ON d."versionId" = v.id AND d.characteristic = l.characteristic AND d.difficulty = l.difficulty
    ORDER BY l.id
  `);
  return result.rows.map(row => ({
    leaderboardId: row.id,
    songHash: row.songHash,
    songName: row.songName,
    songSubName: row.songSubName,
    songAuthorName: row.songAuthorName,
    levelAuthorName: row.levelAuthorName,
    difficulty: row.difficulty,
    characteristic: row.characteristic,
    stars: Number(row.stars),
    seconds: row.seconds === null ? 0 : Number(row.seconds),
    nps: row.nps === null ? 0 : Number(row.nps),
  }));
}

/**
 * Streams every pp-worthy score of the default realm into typed arrays with a server side cursor, so
 * the ~15M rows never exist as JS objects at once.
 *
 * @param maps the ranked maps; their position is the map index of the fit
 */
export async function loadFitData(
  maps: { leaderboardId: number; stars: number }[],
  params: SuggestedMapsParams
) {
  const mapIndex = new Map<number, number>();
  maps.forEach((map, i) => mapIndex.set(map.leaderboardId, i));

  const mapStars = new Float64Array(maps.length);
  const mapFeatures = new Float64Array(maps.length * SUGGESTED_MAPS_FEATURE_COUNT);
  maps.forEach((map, i) => {
    mapStars[i] = map.stars;
    mapFeatures.set(buildMapFeatures(map.stars), i * SUGGESTED_MAPS_FEATURE_COUNT);
  });

  const playerIndex = new Map<string, number>();
  let capacity = 1 << 22;
  let playerIdx = new Int32Array(capacity);
  let mapIdx = new Int32Array(capacity);
  let y = new Float32Array(capacity);
  let weight = new Float32Array(capacity);
  let rows = 0;

  await db.transaction(async tx => {
    await tx.execute(sql`
      DECLARE suggested_maps_scores NO SCROLL CURSOR FOR
      SELECT sr."playerId", sr."leaderboardId", s.accuracy,
        extract(epoch FROM (now() - s.timestamp)) / 86400 AS "ageDays",
        s."missedNotes" + s."badCuts" AS errors,
        s."fullCombo" AS "fullCombo"
      FROM "scoresaber-score-realms" sr
      JOIN "scoresaber-scores" s ON s."scoreId" = sr."scoreId"
      WHERE sr."realmId" = ${DEFAULT_REALM_ID} AND s.accuracy >= ${params.minAccuracy} AND sr.pp >= ${params.minPp}
    `);
    for (;;) {
      const batch = await tx.execute<ScoreRow>(sql.raw(`FETCH ${FETCH_SIZE} FROM suggested_maps_scores`));
      if (batch.rows.length === 0) {
        break;
      }
      if (rows + batch.rows.length > capacity) {
        capacity *= 2;
        const nextPlayers = new Int32Array(capacity);
        const nextMaps = new Int32Array(capacity);
        const nextY = new Float32Array(capacity);
        const nextWeight = new Float32Array(capacity);
        nextPlayers.set(playerIdx);
        nextMaps.set(mapIdx);
        nextY.set(y);
        nextWeight.set(weight);
        playerIdx = nextPlayers;
        mapIdx = nextMaps;
        y = nextY;
        weight = nextWeight;
      }
      for (const row of batch.rows) {
        const map = mapIndex.get(row.leaderboardId);
        if (map === undefined) {
          continue;
        }
        let player = playerIndex.get(row.playerId);
        if (player === undefined) {
          player = playerIndex.size;
          playerIndex.set(row.playerId, player);
        }
        playerIdx[rows] = player;
        mapIdx[rows] = map;
        y[rows] = accuracyToLogit(Number(row.accuracy), params);
        weight[rows] = scoreWeight(
          { ageDays: Number(row.ageDays), errors: Number(row.errors), fullCombo: row.fullCombo },
          params
        );
        rows++;
      }
    }
    await tx.execute(sql`CLOSE suggested_maps_scores`);
  });

  return {
    playerCount: playerIndex.size,
    mapCount: maps.length,
    playerIdx: playerIdx.subarray(0, rows),
    mapIdx: mapIdx.subarray(0, rows),
    y: y.subarray(0, rows),
    weight: weight.subarray(0, rows),
    mapStars,
    mapFeatures,
  };
}

/**
 * Lists the pp-worthy scores of one player in the default realm, best first.
 */
export async function listPlayerScores(playerId: string) {
  const result = await db.execute<{
    leaderboardId: number;
    pp: number;
    accuracy: number;
    ageDays: number;
    errors: number;
    fullCombo: boolean;
  }>(sql`
    SELECT sr."leaderboardId", sr.pp, s.accuracy,
      extract(epoch FROM (now() - s.timestamp)) / 86400 AS "ageDays",
      s."missedNotes" + s."badCuts" AS errors,
      s."fullCombo" AS "fullCombo"
    FROM "scoresaber-score-realms" sr
    JOIN "scoresaber-scores" s ON s."scoreId" = sr."scoreId"
    WHERE sr."realmId" = ${DEFAULT_REALM_ID} AND sr."playerId" = ${playerId}
    ORDER BY sr.pp DESC
  `);
  return result.rows.map(row => ({
    leaderboardId: row.leaderboardId,
    pp: Number(row.pp),
    accuracy: Number(row.accuracy),
    ageDays: Number(row.ageDays),
    errors: Number(row.errors),
    fullCombo: row.fullCombo,
  }));
}

/**
 * Lists the ranked scores of one player in a realm with their map stars, best pp first.
 */
export async function listPlayerRankedScores(playerId: string, realmId: number) {
  const result = await db.execute<{
    leaderboardId: number;
    stars: number;
    pp: number;
    accuracy: number;
    fullCombo: boolean;
    timestampMs: number;
  }>(sql`
    SELECT sr."leaderboardId", lr.stars, sr.pp, s.accuracy, s."fullCombo",
      extract(epoch FROM s.timestamp) * 1000 AS "timestampMs"
    FROM "scoresaber-score-realms" sr
    JOIN "scoresaber-scores" s ON s."scoreId" = sr."scoreId"
    JOIN "scoresaber-leaderboard-realms" lr
      ON lr."leaderboardId" = sr."leaderboardId" AND lr."realmId" = sr."realmId"
    WHERE sr."realmId" = ${realmId} AND sr."playerId" = ${playerId} AND sr.pp > 0
    ORDER BY sr.pp DESC
  `);
  return result.rows.map(row => ({
    leaderboardId: row.leaderboardId,
    stars: Number(row.stars),
    pp: Number(row.pp),
    accuracy: Number(row.accuracy),
    fullCombo: row.fullCombo,
    timestamp: new Date(Number(row.timestampMs)),
  }));
}
