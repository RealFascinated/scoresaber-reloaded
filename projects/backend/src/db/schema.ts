import { HMD } from "@ssr/common/hmds";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { ScoreSaberPlayerScoreStats } from "@ssr/common/schemas/scoresaber/player/score-stats";
import { isNotNull, sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const scoreSaberAccountsTable = pgTable(
  "scoresaber-accounts",
  {
    id: varchar({ length: 32 }).primaryKey(),
    name: text().notNull(),
    country: varchar({ length: 32 }),
    avatar: text().notNull().default("https://cdn.fascinated.cc/assets/unknown.png"),

    // Peak rank
    peakRank: integer(),
    peakRankTimestamp: timestamp(),

    seededScores: boolean().notNull(),
    seededBeatLeaderScores: boolean().notNull(),
    cachedProfilePicture: boolean().notNull(),

    trackReplays: boolean().notNull(),

    inactive: boolean().notNull(),
    banned: boolean().notNull(),

    hmd: varchar({ length: 32 }).$type<HMD>().notNull().default("Unknown"),
    pp: doublePrecision().notNull().default(0),
    medals: integer().notNull().default(0),
    medalsRank: integer().notNull().default(0),
    medalsCountryRank: integer().notNull().default(0),

    scoreStats: jsonb().$type<ScoreSaberPlayerScoreStats>().notNull(),

    trackedSince: timestamp().notNull(),
    joinedDate: timestamp().notNull(),
  },
  table => [
    index("accounts_name_trgm_idx").using("gin", sql`${table.name} gin_trgm_ops`),
    index("accounts_medals_idx").on(table.medals.desc()),
    index("accounts_active_hmd_idx").on(table.hmd).where(sql`${table.inactive} = false`),
    index("accounts_active_country_idx")
      .on(table.country)
      .where(sql`${table.inactive} = false AND ${table.country} IS NOT NULL AND ${table.country} <> ''`),
    index("accounts_joined_date_idx").on(table.joinedDate),
    index("accounts_seeded_bl_false_idx")
      .on(table.id)
      .where(sql`${table.seededBeatLeaderScores} = false`),
    index("accounts_seeded_scores_false_idx").on(table.id).where(sql`${table.seededScores} = false`),
    index("accounts_inactive_true_idx")
      .on(table.inactive)
      .where(sql`${table.inactive} = true`),
  ]
);

export const playerHistoryTable = pgTable(
  "scoresaber-player-history",
  {
    // Identifiers
    id: serial().primaryKey(),
    playerId: varchar({ length: 32 }).notNull(),
    date: timestamp().notNull(),

    // Rank stats
    rank: integer(),
    countryRank: integer(),

    // Medals stats
    medals: integer(),

    // PP stats
    pp: doublePrecision(),
    plusOnePp: doublePrecision(),

    // Score stats
    totalScore: doublePrecision(),
    totalRankedScore: doublePrecision(),
    rankedScores: integer(),
    unrankedScores: integer(),
    rankedScoresImproved: integer(),
    unrankedScoresImproved: integer(),
    totalRankedScores: integer(),
    totalUnrankedScores: integer(),
    totalScores: integer(),

    // Accuracy stats
    averageRankedAccuracy: doublePrecision(),
    averageUnrankedAccuracy: doublePrecision(),
    averageAccuracy: doublePrecision(),

    // Ranked play stats
    aPlays: integer(),
    sPlays: integer(),
    spPlays: integer(),
    ssPlays: integer(),
    sspPlays: integer(),
    godPlays: integer(),
  },
  table => [uniqueIndex("scoresaber_player_history_player_id_date_unique").on(table.playerId, table.date)]
);

export const scoreSaberScoresTable = pgTable(
  "scoresaber-scores",
  {
    // Identifiers
    scoreId: integer().primaryKey(),
    playerId: varchar({ length: 32 }).notNull(),
    leaderboardId: integer().notNull(),

    // Leaderboard information
    difficulty: varchar({ length: 64 }).$type<MapDifficulty>().notNull(),
    characteristic: text().$type<MapCharacteristic>().notNull(),

    // Score information
    score: integer().notNull(),
    accuracy: doublePrecision().notNull(),
    pp: doublePrecision().notNull().default(0),
    medals: integer().notNull().default(0),
    missedNotes: integer().notNull(),
    badCuts: integer().notNull(),
    maxCombo: integer().notNull(),
    fullCombo: boolean().notNull(),
    modifiers: varchar({ length: 32 }).array(),

    // Headset information
    hmd: varchar({ length: 32 }).$type<HMD>().notNull().default("Unknown"),
    rightController: varchar({ length: 32 }),
    leftController: varchar({ length: 32 }),

    timestamp: timestamp().notNull(),
  },
  table => [
    index("scores_player_leaderboard_idx").on(table.playerId, table.leaderboardId),
    index("scores_player_pp_desc_idx").on(table.playerId, table.pp.desc(), table.scoreId.desc()),
    index("scores_pp_desc_player_partial_idx")
      .on(table.pp.desc(), table.playerId)
      .where(sql`${table.pp} > 0`),
    index("scores_leaderboard_id_idx").on(table.leaderboardId),
    index("scores_leaderboard_score_scoreid_desc_idx").on(
      table.leaderboardId,
      table.score.desc(),
      table.scoreId.desc()
    ),
    index("scores_leaderboard_medals_nonzero_idx")
      .on(table.leaderboardId)
      .where(sql`${table.medals} <> 0`),
    index("scores_player_medals_positive_idx")
      .on(table.playerId)
      .where(sql`${table.medals} > 0`),
  ]
);

export const scoreSaberScoreHistoryTable = pgTable(
  "scoresaber-score-history",
  {
    // Identifiers
    id: serial().primaryKey(),
    playerId: varchar({ length: 32 }).notNull(),
    leaderboardId: integer().notNull(),
    scoreId: integer().notNull(),

    // Leaderboard information
    difficulty: varchar({ length: 64 }).$type<MapDifficulty>().notNull(),
    characteristic: text().$type<MapCharacteristic>().notNull(),

    // Score information
    score: integer().notNull(),
    accuracy: doublePrecision().notNull(),
    pp: doublePrecision().notNull().default(0),
    medals: integer().notNull().default(0),
    missedNotes: integer().notNull(),
    badCuts: integer().notNull(),
    maxCombo: integer().notNull(),
    fullCombo: boolean().notNull(),
    modifiers: varchar({ length: 32 }).array(),

    // Headset information
    hmd: varchar({ length: 32 }).$type<HMD>().notNull().default("Unknown"),
    rightController: varchar({ length: 32 }),
    leftController: varchar({ length: 32 }),

    timestamp: timestamp().notNull(),
  },
  table => [
    index("scoresaber_score_history_leaderboard_idx").on(table.leaderboardId),
    index("scoresaber_score_history_player_leaderboard_time_idx").on(
      table.playerId,
      table.leaderboardId,
      table.timestamp.desc()
    ),
    uniqueIndex("scoresaber_score_history_leaderboard_player_score_unique").on(
      table.leaderboardId,
      table.playerId,
      table.score
    ),
  ]
);

export const scoreSaberLeaderboardsTable = pgTable(
  "scoresaber-leaderboards",
  {
    id: integer().primaryKey(),

    // Song information
    songHash: varchar({ length: 64 }).notNull(),
    songName: text().notNull(),
    songSubName: text().notNull(),
    songAuthorName: text().notNull(),

    // Level information
    levelAuthorName: text().notNull(),

    // Difficulty information
    difficulty: varchar({ length: 64 }).$type<MapDifficulty>().notNull(),
    characteristic: text().$type<MapCharacteristic>().notNull(),
    maxScore: integer().notNull(),

    // Ranking information
    ranked: boolean().notNull(),
    qualified: boolean().notNull(),
    stars: doublePrecision(),
    rankedDate: timestamp(),
    qualifiedDate: timestamp(),

    // Play information
    plays: integer().notNull(),
    dailyPlays: integer().notNull(),

    // Misc
    seededScores: boolean().notNull(),
    cachedSongArt: boolean().notNull(),
    trendingScore: doublePrecision().notNull().default(0),

    timestamp: timestamp().notNull(),
  },
  table => [
    index("leaderboards_search_idx").using(
      "gin",
      sql`to_tsvector('english', ${table.songName} || ' ' || ${table.songSubName} || ' ' || ${table.songAuthorName} || ' ' || ${table.levelAuthorName})`
    ),
    index("leaderboards_song_lookup_idx").on(
      sql`lower(${table.songHash})`,
      table.difficulty,
      table.characteristic
    ),
    index("leaderboards_song_hash_idx").on(table.songHash),
    index("leaderboards_seeded_scores_false_idx")
      .on(table.seededScores)
      .where(sql`${table.seededScores} = false`),
    index("leaderboards_ranked_true_idx")
      .on(table.ranked)
      .where(sql`${table.ranked} = true`),
    index("leaderboards_qualified_true_idx")
      .on(table.qualified)
      .where(sql`${table.qualified} = true`),
    index("leaderboards_ranked_date_desc_idx").on(table.rankedDate.desc()),
    index("leaderboards_plays_desc_idx").on(table.plays.desc()),
    index("leaderboards_daily_plays_desc_idx").on(table.dailyPlays.desc()),
    index("leaderboards_stars_not_null_idx").on(table.stars).where(isNotNull(table.stars)),
    index("leaderboards_trending_score_desc_idx").on(table.trendingScore.desc()),
  ]
);

export const scoreSaberLeaderboardStarChangeTable = pgTable(
  "scoresaber-leaderboard-star-change",
  {
    id: serial().primaryKey(),
    leaderboardId: integer().notNull(),
    previousStars: doublePrecision().notNull(),
    newStars: doublePrecision().notNull(),
    timestamp: timestamp().notNull(),
  },
  table => [
    index("leaderboard_star_change_leaderboard_time_idx").on(table.leaderboardId, table.timestamp.desc()),
  ]
);

export const beatLeaderScoresTable = pgTable(
  "beatleader-scores",
  {
    // Identifiers
    id: integer().primaryKey(),
    playerId: varchar({ length: 32 }).notNull(),
    songHash: varchar({ length: 64 }).notNull(),
    leaderboardId: text().notNull(),
    songDifficulty: varchar({ length: 64 }).$type<MapDifficulty>().notNull(),
    songCharacteristic: varchar({ length: 128 }).$type<MapCharacteristic>().notNull(),
    songScore: integer().notNull(),

    // Score information
    pauses: integer().notNull(),
    fcAccuracy: doublePrecision().notNull(),
    fullCombo: boolean().notNull(),
    savedReplay: boolean().notNull(),

    // Hand accuracy
    leftHandAccuracy: doublePrecision().notNull(),
    rightHandAccuracy: doublePrecision().notNull(),

    // Misses
    misses: integer().notNull(),
    missedNotes: integer().notNull(),
    bombCuts: integer().notNull(),
    wallsHit: integer().notNull(),
    badCuts: integer().notNull(),

    // Score improvement
    improvementScore: integer().notNull(),
    improvementPauses: integer().notNull(),
    improvementMisses: integer().notNull(),
    improvementMissedNotes: integer().notNull(),
    improvementBombCuts: integer().notNull(),
    improvementWallsHit: integer().notNull(),
    improvementBadCuts: integer().notNull(),
    improvementLeftHandAccuracy: doublePrecision().notNull(),
    improvementRightHandAccuracy: doublePrecision().notNull(),

    timestamp: timestamp().notNull(),
  },
  table => [
    index("beatleader_scores_player_map_score_time_idx").on(
      table.playerId,
      table.songHash,
      table.songDifficulty,
      table.songCharacteristic,
      table.songScore,
      table.timestamp.desc()
    ),
    index("beatleader_scores_saved_replay_true_idx")
      .on(table.savedReplay)
      .where(sql`${table.savedReplay} = true`),
    index("beatleader_scores_player_map_leaderboard_time_idx").on(
      table.playerId,
      table.songHash,
      table.leaderboardId,
      sql`${table.timestamp} DESC NULLS LAST`
    ),
  ]
);

export const beatSaverUploadersTable = pgTable("beatsaver-uploaders", {
  id: integer().primaryKey(),
  name: text(),
  hash: text(),
  avatar: text(),
  type: text(),
  admin: boolean(),
  curator: boolean(),
  seniorCurator: boolean(),
  verifiedMapper: boolean(),
  playlistUrl: text(),
});

export const beatSaverMapsTable = pgTable(
  "beatsaver-maps",
  {
    id: varchar({ length: 32 }).primaryKey(),
    name: text().notNull(),
    description: text().notNull(),

    // Uploader
    uploaderId: integer().references(() => beatSaverUploadersTable.id),

    // Metadata
    bpm: doublePrecision(),
    duration: integer(),
    songName: text(),
    songSubName: text(),
    songAuthorName: text(),
    songAuthorUrl: text(),
    levelAuthorName: text(),

    uploadedAt: timestamp(),
    automapper: boolean(),
    createdAt: timestamp(),
    updatedAt: timestamp(),
    lastPublishedAt: timestamp(),
    tags: text().array(),
  },
  table => [index("beatsaver_maps_uploader_id_idx").on(table.uploaderId)]
);

export const beatSaverMapVersionsTable = pgTable(
  "beatsaver-map-versions",
  {
    id: serial().primaryKey(),
    mapId: varchar({ length: 32 })
      .notNull()
      .references(() => beatSaverMapsTable.id),
    hash: varchar({ length: 64 }).notNull(),
    stage: text(),
    createdAt: timestamp(),
    downloadUrl: text(),
    coverUrl: text(),
    previewUrl: text(),
  },
  table => [
    uniqueIndex("beatsaver_map_versions_hash_unique").on(table.hash),
    index("beatsaver_map_versions_map_id_created_at_idx").on(table.mapId, table.createdAt.desc()),
  ]
);

export const beatSaverMapDifficultiesTable = pgTable(
  "beatsaver-map-difficulties",
  {
    id: serial().primaryKey(),
    versionId: integer()
      .notNull()
      .references(() => beatSaverMapVersionsTable.id),
    characteristic: text().$type<MapCharacteristic>(),
    difficulty: text().$type<MapDifficulty>(),
    njs: doublePrecision(),
    offset: doublePrecision(),
    notes: integer(),
    bombs: integer(),
    obstacles: integer(),
    nps: doublePrecision(),
    length: doublePrecision(),
    events: integer(),
    chroma: boolean(),
    mappingExtensions: boolean(),
    noodleExtensions: boolean(),
    cinema: boolean(),
    seconds: doublePrecision(),
    maxScore: integer(),
    label: text(),
  },
  table => [
    uniqueIndex("beatsaver_map_difficulties_version_char_diff_unique").on(
      table.versionId,
      table.characteristic,
      table.difficulty
    ),
    index("beatsaver_map_difficulties_version_id_idx").on(table.versionId),
  ]
);

export const metricsTable = pgTable("metrics", {
  id: varchar({ length: 64 }).primaryKey(),
  value: jsonb().$type<unknown>(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const scoreSaberScoreEventTable = pgTable(
  "scoresaber-score-events",
  {
    // Identifiers
    id: serial().primaryKey(),
    playerId: varchar({ length: 32 })
      .notNull()
      .references(() => scoreSaberAccountsTable.id, { onDelete: "no action" }),
    leaderboardId: integer()
      .notNull()
      .references(() => scoreSaberLeaderboardsTable.id, { onDelete: "no action" }),

    timestamp: timestamp().notNull(),
  },
  table => [
    index("score_events_leaderboard_timestamp_idx").on(table.leaderboardId, table.timestamp),
    index("score_events_timestamp_idx").on(table.timestamp),
    index("score_events_timestamp_brin_idx").using("brin", table.timestamp),
  ]
);

export type ScoreSaberAccountRow = typeof scoreSaberAccountsTable.$inferSelect;
export type PlayerHistoryRow = typeof playerHistoryTable.$inferSelect;
export type ScoreSaberScoreRow = typeof scoreSaberScoresTable.$inferSelect;
export type ScoreSaberScoreHistoryRow = typeof scoreSaberScoreHistoryTable.$inferSelect;
export type ScoreSaberLeaderboardRow = typeof scoreSaberLeaderboardsTable.$inferSelect;
export type ScoreSaberLeaderboardStarChangeRow = typeof scoreSaberLeaderboardStarChangeTable.$inferSelect;
export type BeatLeaderScoreRow = typeof beatLeaderScoresTable.$inferSelect;
export type BeatSaverUploaderRow = typeof beatSaverUploadersTable.$inferSelect;
export type BeatSaverMapRow = typeof beatSaverMapsTable.$inferSelect;
export type BeatSaverMapVersionRow = typeof beatSaverMapVersionsTable.$inferSelect;
export type BeatSaverMapDifficultyRow = typeof beatSaverMapDifficultiesTable.$inferSelect;
export type MetricRow = typeof metricsTable.$inferSelect;
