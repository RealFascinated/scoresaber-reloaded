import { HMD } from "@ssr/common/hmds";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { ScoreSaberPlayerScoreStats } from "@ssr/common/schemas/scoresaber/player/score-stats";
import { sql } from "drizzle-orm";
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
    avatar: text().default("https://cdn.fascinated.cc/assets/unknown.png"),

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

    scoreStats: jsonb().$type<ScoreSaberPlayerScoreStats>().notNull(),

    trackedSince: timestamp().notNull(),
    joinedDate: timestamp().notNull(),
  },
  table => [
    index("accounts_name_idx").on(table.name),
    index("accounts_medals_idx").on(table.medals.desc()),
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
    // Identifiers (aligned with history table FK name `scoreId`)
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
    index("scores_leaderboard_id_idx").on(table.leaderboardId),
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
  ]
);

export const scoreSaberMedalScoresTable = pgTable(
  "scoresaber-medal-scores",
  {
    // Identifiers
    id: integer().primaryKey(),
    playerId: varchar({ length: 32 }).notNull(),
    leaderboardId: integer().notNull(),

    // Leaderboard information
    difficulty: varchar({ length: 64 }).$type<MapDifficulty>().notNull(),
    characteristic: text().$type<MapCharacteristic>().notNull(),

    // Score information
    score: integer().notNull(),
    accuracy: doublePrecision().notNull(),
    medals: integer().notNull(),
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
    index("medal_scores_leaderboard_score_idx").on(table.leaderboardId, table.score.desc(), table.id.desc()),
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
  table => [
    index("beatsaver_maps_created_at_idx").on(table.createdAt),
    index("beatsaver_maps_tags_idx").on(table.tags),
    index("beatsaver_maps_uploader_id_idx").on(table.uploaderId),
  ]
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

export type ScoreSaberAccountRow = typeof scoreSaberAccountsTable.$inferSelect;
export type PlayerHistoryRow = typeof playerHistoryTable.$inferSelect;
export type ScoreSaberScoreRow = typeof scoreSaberScoresTable.$inferSelect;
export type ScoreSaberScoreHistoryRow = typeof scoreSaberScoreHistoryTable.$inferSelect;
export type ScoreSaberMedalScoreRow = typeof scoreSaberMedalScoresTable.$inferSelect;
export type ScoreSaberLeaderboardRow = typeof scoreSaberLeaderboardsTable.$inferSelect;
export type ScoreSaberLeaderboardStarChangeRow = typeof scoreSaberLeaderboardStarChangeTable.$inferSelect;
export type BeatLeaderScoreRow = typeof beatLeaderScoresTable.$inferSelect;
export type BeatSaverUploaderRow = typeof beatSaverUploadersTable.$inferSelect;
export type BeatSaverMapRow = typeof beatSaverMapsTable.$inferSelect;
export type BeatSaverMapVersionRow = typeof beatSaverMapVersionsTable.$inferSelect;
export type BeatSaverMapDifficultyRow = typeof beatSaverMapDifficultiesTable.$inferSelect;
export type MetricRow = typeof metricsTable.$inferSelect;
