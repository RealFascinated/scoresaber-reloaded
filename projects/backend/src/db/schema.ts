import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const scoreSaberScoresTable = pgTable("scoresaber-scores", {
  // Identifiers
  scoreId: integer().primaryKey(),
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
});

export const scoreSaberScoreHistoryTable = pgTable("scoresaber-score-history", {
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
});

export const scoreSaberMedalScoresTable = pgTable("scoresaber-medal-scores", {
  // Identifiers
  scoreId: integer().primaryKey(),
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
});

export const scoreSaberLeaderboardsTable = pgTable(
  "scoresaber-leaderboards",
  {
    id: integer().primaryKey(),

    // Song information
    songHash: varchar({ length: 64 }).notNull(),
    songName: varchar({ length: 255 }).notNull(),
    songSubName: varchar({ length: 255 }).notNull(),
    songAuthorName: varchar({ length: 255 }).notNull(),

    // Level information
    levelAuthorName: varchar({ length: 255 }).notNull(),

    // Difficulty information
    difficulty: varchar({ length: 64 }).notNull(),
    characteristic: varchar({ length: 128 }).notNull(),
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
  ]
);

export const scoreSaberLeaderboardStarChangeTable = pgTable("scoresaber-leaderboard-star-change", {
  id: serial().primaryKey(),
  leaderboardId: integer().notNull(),
  previousStars: doublePrecision().notNull(),
  newStars: doublePrecision().notNull(),
  timestamp: timestamp().notNull(),
});

export type ScoreSaberScoreRow = typeof scoreSaberScoresTable.$inferSelect;
export type ScoreSaberScoreHistoryRow = typeof scoreSaberScoreHistoryTable.$inferSelect;
export type ScoreSaberMedalScoreRow = typeof scoreSaberMedalScoresTable.$inferSelect;
export type ScoreSaberLeaderboardRow = typeof scoreSaberLeaderboardsTable.$inferSelect;
export type ScoreSaberLeaderboardStarChangeRow = typeof scoreSaberLeaderboardStarChangeTable.$inferSelect;
