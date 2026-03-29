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

    // Peak rank
    peakRank: integer(),
    peakRankTimestamp: timestamp(),

    seededScores: boolean().notNull(),
    seededBeatLeaderScores: boolean().notNull(),
    cachedProfilePicture: boolean().notNull(),

    trackReplays: boolean().notNull(),

    inactive: boolean().notNull(),
    banned: boolean().notNull(),

    hmd: varchar({ length: 32 }),
    pp: doublePrecision().notNull().default(0),
    medals: integer().notNull().default(0),

    scoreStats: jsonb().$type<ScoreSaberPlayerScoreStats>().notNull(),

    trackedSince: timestamp().notNull(),
    joinedDate: timestamp().notNull(),
  },
  table => [index("accounts_name_idx").on(table.name), index("accounts_medals_idx").on(table.medals.desc())]
);

/** Daily (or per-snapshot) statistics for a tracked player. Matches Mongo `player-history` collection. */
export const playerHistoryTable = pgTable(
  "player-history",
  {
    id: serial().primaryKey(),
    playerId: varchar({ length: 32 }).notNull(),
    date: timestamp().notNull(),

    rank: integer(),
    countryRank: integer(),
    medals: integer(),
    pp: doublePrecision(),
    plusOnePp: doublePrecision(),
    totalScore: doublePrecision(),
    totalRankedScore: doublePrecision(),

    rankedScores: integer(),
    unrankedScores: integer(),
    rankedScoresImproved: integer(),
    unrankedScoresImproved: integer(),
    totalRankedScores: integer(),
    totalUnrankedScores: integer(),
    totalScores: integer(),

    averageRankedAccuracy: doublePrecision(),
    averageUnrankedAccuracy: doublePrecision(),
    averageAccuracy: doublePrecision(),

    aPlays: integer(),
    sPlays: integer(),
    spPlays: integer(),
    ssPlays: integer(),
    sspPlays: integer(),
    godPlays: integer(),
  },
  table => [
    uniqueIndex("player_history_player_id_date_unique").on(table.playerId, table.date),
    index("player_history_player_id_date_idx").on(table.playerId, table.date.desc()),
  ]
);

export const scoreSaberScoresTable = pgTable(
  "scoresaber-scores",
  {
    // Identifiers
    id: integer().primaryKey(),
    playerId: varchar({ length: 32 }).notNull(),
    leaderboardId: integer().notNull(),

    // Leaderboard information
    difficulty: varchar({ length: 64 }).notNull(),
    characteristic: varchar({ length: 128 }).notNull(),

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
    hmd: varchar({ length: 32 }),
    rightController: varchar({ length: 32 }),
    leftController: varchar({ length: 32 }),

    timestamp: timestamp().notNull(),
  },
  table => [
    index("scores_player_leaderboard_idx").on(table.playerId, table.leaderboardId),
    index("scores_leaderboard_id_idx").on(table.leaderboardId),
    index("scores_pp_positive_idx")
      .on(table.pp.desc())
      .where(sql`${table.pp} > 0`),
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
    difficulty: varchar({ length: 64 }).notNull(),
    characteristic: varchar({ length: 128 }).notNull(),

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
    hmd: varchar({ length: 32 }),
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
    difficulty: varchar({ length: 64 }).notNull(),
    characteristic: varchar({ length: 128 }).notNull(),

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
    hmd: varchar({ length: 32 }),
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
    difficulty: varchar({ length: 64 }).notNull(),
    characteristic: text().notNull(),
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
    leaderboardId: varchar({ length: 32 }).notNull(),
    songDifficulty: varchar({ length: 64 }).notNull(),
    songCharacteristic: varchar({ length: 128 }).notNull(),
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
  ]
);

export type ScoreSaberAccountRow = typeof scoreSaberAccountsTable.$inferSelect;
export type PlayerHistoryRow = typeof playerHistoryTable.$inferSelect;
export type ScoreSaberScoreRow = typeof scoreSaberScoresTable.$inferSelect;
export type ScoreSaberScoreHistoryRow = typeof scoreSaberScoreHistoryTable.$inferSelect;
export type ScoreSaberMedalScoreRow = typeof scoreSaberMedalScoresTable.$inferSelect;
export type ScoreSaberLeaderboardRow = typeof scoreSaberLeaderboardsTable.$inferSelect;
export type ScoreSaberLeaderboardStarChangeRow = typeof scoreSaberLeaderboardStarChangeTable.$inferSelect;
export type BeatLeaderScoreRow = typeof beatLeaderScoresTable.$inferSelect;
