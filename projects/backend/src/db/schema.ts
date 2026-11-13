import { AuthConnectionProvider } from "@ssr/common/schemas/auth/connection-provider";
import type { HMD } from "@ssr/common/schemas/hmd";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import type { OverlayConnectionSettings } from "@ssr/common/schemas/overlay/overlay-connection-settings";
import type { OverlayLayout } from "@ssr/common/schemas/overlay/overlay-layout";
import type { UserPreferencesPatch } from "@ssr/common/schemas/user/preferences";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

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

    // BeatLeader backfill progress. `beatLeaderSeedPage` is how many score pages
    // were processed on the last attempt and is where the next attempt resumes;
    // the attempt counter and timestamp drive the retry backoff so a player that
    // cannot be seeded is not retried on every 10-minute queue cycle forever.
    beatLeaderSeedPage: integer().notNull().default(0),
    beatLeaderSeedAttempts: integer().notNull().default(0),
    beatLeaderSeedLastAttempt: timestamp(),

    trackReplays: boolean().notNull(),

    inactive: boolean().notNull(),
    banned: boolean().notNull(),

    hmd: varchar({ length: 32 }).$type<HMD>().notNull().default("Unknown"),
    pp: doublePrecision().notNull().default(0),
    medals: integer().notNull().default(0),
    medalsRank: integer().notNull().default(0),
    medalsCountryRank: integer().notNull().default(0),

    // Played streak
    currentStreak: integer().notNull().default(0),
    longestStreak: integer().notNull().default(0),
    lastPlayedDate: date({ mode: "string" }),

    trackedSince: timestamp().notNull(),
    joinedDate: timestamp().notNull(),
  },
  table => [
    index("accounts_name_trgm_idx").using("gin", sql`${table.name} gin_trgm_ops`),
    index("accounts_medals_idx").on(table.medals.desc()),
    index("accounts_medal_ranking_idx")
      .on(table.medals.desc(), table.id.asc())
      .where(
        sql`${table.medals} > 0 AND ${table.banned} = false AND ${table.country} IS NOT NULL AND ${table.country} <> ''`
      ),
    index("accounts_medal_ranking_country_idx")
      .on(table.country, table.medals.desc(), table.id.asc())
      .where(
        sql`${table.medals} > 0 AND ${table.banned} = false AND ${table.country} IS NOT NULL AND ${table.country} <> ''`
      ),
    index("accounts_stale_medals_rank_idx")
      .on(table.id)
      .where(sql`${table.medalsRank} <> 0 OR ${table.medalsCountryRank} <> 0`),
    index("accounts_clear_medals_rank_idx")
      .on(table.id)
      .where(
        sql`(${table.medalsRank} <> 0 OR ${table.medalsCountryRank} <> 0) AND NOT (${table.medals} > 0 AND ${table.country} IS NOT NULL AND ${table.country} <> '' AND ${table.banned} = false)`
      ),
    index("accounts_active_hmd_idx")
      .on(table.hmd)
      .where(sql`${table.inactive} = false`),
    index("accounts_active_country_idx")
      .on(table.country)
      .where(sql`${table.inactive} = false AND ${table.country} IS NOT NULL AND ${table.country} <> ''`),
    index("accounts_joined_date_idx").on(table.joinedDate),
    index("accounts_seeded_bl_false_idx")
      .on(table.id)
      .where(sql`${table.seededBeatLeaderScores} = false`),
    index("accounts_seeded_scores_false_idx")
      .on(table.id)
      .where(sql`${table.seededScores} = false`),
    index("accounts_inactive_true_idx")
      .on(table.inactive)
      .where(sql`${table.inactive} = true`),
    index("accounts_streak_expiry_date_idx")
      .on(table.lastPlayedDate)
      .where(sql`${table.currentStreak} > 0 AND ${table.lastPlayedDate} IS NOT NULL`),
  ]
);

export const playerHistoryTable = pgTable(
  "scoresaber-player-history",
  {
    // Identifiers
    id: serial().primaryKey(),
    playerId: varchar({ length: 32 }).notNull(),
    date: timestamp().notNull(),
    realmId: integer().notNull().default(1),

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
  table => [
    uniqueIndex("scoresaber_player_history_player_id_date_realm_unique").on(
      table.playerId,
      table.date,
      table.realmId
    ),
  ]
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
    uniqueIndex("scores_player_leaderboard_unique").on(table.playerId, table.leaderboardId),
    // Time-window lookups per player (BL account resolution, score charts):
    // playerId IN (...) AND timestamp BETWEEN ... would otherwise scan every
    // row of each candidate player.
    index("scores_player_id_timestamp_idx").on(table.playerId, table.timestamp),
    // Also serves every plain `leaderboardId = ?` lookup through its leading column, so a separate
    // single-column leaderboardId index would only add write cost and size.
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
    // Archived-score lookups by scoreId (GET /scores/:scoreId fallback) would
    // otherwise seq-scan the whole history table.
    index("scoresaber_score_history_score_id_idx").on(table.scoreId),
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

    // Play information
    plays: integer().notNull(),
    dailyPlays: integer().notNull(),

    // Misc
    seededScores: boolean().notNull(),
    trendingScore: doublePrecision().notNull().default(0),

    timestamp: timestamp().notNull(),

    // Full-text search document, kept up to date by Postgres. Storing it (instead of calling
    // to_tsvector in every query) lets ts_rank read it directly rather than re-parsing the text
    // of every matching row.
    searchVector: tsvector().generatedAlwaysAs(
      sql.raw(
        `to_tsvector('english', "songName" || ' ' || "songSubName" || ' ' || "songAuthorName" || ' ' || "levelAuthorName")`
      )
    ),
  },
  table => [
    index("leaderboards_search_idx").using("gin", table.searchVector),
    index("leaderboards_song_lookup_idx").on(
      sql`lower(${table.songHash})`,
      table.difficulty,
      table.characteristic
    ),
    index("leaderboards_song_hash_idx").on(table.songHash),
    index("leaderboards_seeded_scores_false_idx")
      .on(table.seededScores)
      .where(sql`${table.seededScores} = false`),
    index("leaderboards_timestamp_desc_idx").on(table.timestamp.desc()),
    index("leaderboards_plays_desc_idx").on(table.plays.desc()),
    index("leaderboards_daily_plays_desc_idx").on(table.dailyPlays.desc()),
    index("leaderboards_trending_score_desc_idx").on(table.trendingScore.desc()),
  ]
);

/**
 * Per-realm ranking state of a leaderboard. Sparse: a row exists only while the
 * leaderboard is ranked or qualified in that realm; no row means unranked (0 stars).
 */
export const scoreSaberLeaderboardRealmsTable = pgTable(
  "scoresaber-leaderboard-realms",
  {
    leaderboardId: integer().notNull(),
    realmId: integer().notNull(),
    ranked: boolean().notNull(),
    qualified: boolean().notNull(),
    stars: doublePrecision().notNull().default(0),
    rankedDate: timestamp(),
    qualifiedDate: timestamp(),
  },
  table => [
    primaryKey({ columns: [table.leaderboardId, table.realmId] }),
    index("leaderboard_realms_ranked_true_idx")
      .on(table.realmId, table.leaderboardId)
      .where(sql`${table.ranked} = true`),
    index("leaderboard_realms_qualified_true_idx")
      .on(table.realmId, table.leaderboardId)
      .where(sql`${table.qualified} = true`),
    index("leaderboard_realms_ranked_date_desc_idx").on(table.realmId, table.rankedDate.desc()),
    index("leaderboard_realms_stars_idx").on(table.realmId, table.stars),
  ]
);

/**
 * Per-realm pp of a score. Sparse: a row exists only for scores worth pp (> 0) in
 * that realm. `playerId` and `leaderboardId` are denormalised from the score row so
 * per-player and per-leaderboard pp lookups never need to join the scores table.
 */
export const scoreSaberScoreRealmsTable = pgTable(
  "scoresaber-score-realms",
  {
    scoreId: integer().notNull(),
    realmId: integer().notNull(),
    playerId: varchar({ length: 32 }).notNull(),
    leaderboardId: integer().notNull(),
    pp: doublePrecision().notNull(),
  },
  table => [
    primaryKey({ columns: [table.scoreId, table.realmId] }),
    index("score_realms_player_pp_desc_idx").on(table.realmId, table.playerId, table.pp.desc()),
    index("score_realms_pp_desc_scoreid_desc_idx").on(table.realmId, table.pp.desc(), table.scoreId.desc()),
    index("score_realms_leaderboard_idx").on(table.realmId, table.leaderboardId),
  ]
);

export const scoreSaberLeaderboardStarChangeTable = pgTable(
  "scoresaber-reweight-leaderboards",
  {
    id: serial().primaryKey(),
    leaderboardId: integer().notNull(),
    realmId: integer().notNull().default(1),
    previousStars: doublePrecision().notNull(),
    newStars: doublePrecision().notNull(),
    timestamp: timestamp().notNull(),
    /** The reweight this change belongs to. Null for changes recorded before reweights existed. */
    reweightId: integer(),
    /** Set while the pp changes of this star change still have to be captured. */
    ppPending: boolean().notNull().default(false),
  },
  table => [
    index("leaderboard_star_change_leaderboard_time_idx").on(table.leaderboardId, table.timestamp.desc()),
    index("leaderboard_star_change_reweight_idx").on(table.reweightId),
  ]
);

/**
 * A reweight: the star changes of a realm that happened within a few days of each other.
 */
export const scoreSaberReweightsTable = pgTable(
  "scoresaber-reweights",
  {
    id: serial().primaryKey(),
    realmId: integer().notNull().default(1),
    /** Overrides the generated "Month Year Reweight" name. */
    name: text(),
    startedAt: timestamp().notNull(),
    endedAt: timestamp().notNull(),
    leaderboardCount: integer().notNull().default(0),
    playerCount: integer().notNull().default(0),
    scoreCount: integer().notNull().default(0),
    /** When the reweight was announced, so merged late changes never announce it again. */
    notifiedAt: timestamp(),
  },
  table => [index("reweights_realm_started_idx").on(table.realmId, table.startedAt.desc())]
);

/**
 * The total pp change of a player for a reweight. Only players whose pp changed have a row.
 */
export const scoreSaberReweightPlayersTable = pgTable(
  "scoresaber-reweight-players",
  {
    reweightId: integer().notNull(),
    playerId: varchar({ length: 32 }).notNull(),
    ppBefore: doublePrecision().notNull(),
    ppAfter: doublePrecision().notNull(),
    ppDelta: doublePrecision().notNull(),
    scoresChanged: integer().notNull(),
  },
  table => [
    primaryKey({ columns: [table.reweightId, table.playerId] }),
    index("reweight_players_player_idx").on(table.playerId, table.reweightId.desc()),
    index("reweight_players_delta_idx").on(table.reweightId, table.ppDelta),
  ]
);

/**
 * The pp change of a single score for a reweight. `ppBefore` is the pp stored before the
 * reweight and `ppAfter` the pp ScoreSaber reports after it.
 */
export const scoreSaberReweightScoresTable = pgTable(
  "scoresaber-reweight-scores",
  {
    reweightId: integer().notNull(),
    scoreId: integer().notNull(),
    playerId: varchar({ length: 32 }).notNull(),
    leaderboardId: integer().notNull(),
    ppBefore: doublePrecision().notNull(),
    ppAfter: doublePrecision().notNull(),
  },
  table => [
    primaryKey({ columns: [table.reweightId, table.scoreId] }),
    index("reweight_scores_player_idx").on(table.playerId, table.reweightId),
    index("reweight_scores_leaderboard_idx").on(table.reweightId, table.leaderboardId),
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

export const beatLeaderPlayersTable = pgTable("beatleader-players", {
  id: text().primaryKey(),
  name: text().notNull().default(""),
  platform: text().notNull().default(""),
  steamId: text(),
  oculusPCId: text(),
  questId: text(),
  lastFetched: timestamp().notNull(),
});

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
    // Also serves every plain `versionId = ?` lookup through its leading column, so a separate
    // single-column versionId index would only add write cost and size.
    uniqueIndex("beatsaver_map_difficulties_version_char_diff_unique").on(
      table.versionId,
      table.characteristic,
      table.difficulty
    ),
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
  ]
);

export const tableCountsTable = pgTable("ssr_table_counts", {
  id: integer().primaryKey(),
  scoresaberScores: bigint({ mode: "number" }).notNull(),
  scoresaberScoreHistory: bigint({ mode: "number" }).notNull(),
  scoresaberAccounts: bigint({ mode: "number" }).notNull(),
  scoresaberInactiveAccounts: bigint({ mode: "number" }).notNull(),
  scoresaberLeaderboards: bigint({ mode: "number" }).notNull(),
  refreshedAt: timestamp().notNull(),
});

/**
 * Better Auth tables. Column keys must stay camelCase and match Better Auth's model fields,
 * the Drizzle adapter maps fields to columns by key.
 */
export const authUsersTable = pgTable(
  "auth-users",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    // Public player id: the primary connection's id (also the ScoreSaber player id).
    // Only written through AuthConnectionService so it stays in sync with the connections.
    playerId: varchar({ length: 32 }),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp()
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => [uniqueIndex("auth_users_player_id_idx").on(table.playerId)]
);

/**
 * The platform accounts (Steam, Oculus) linked to a user, like ScoreSaber's connections.
 * A user has at most one primary connection, whose id is the public player id.
 */
export const authConnectionsTable = pgTable(
  "auth-connections",
  {
    id: serial().primaryKey(),
    userId: text()
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
    provider: varchar({ length: 16 }).$type<AuthConnectionProvider>().notNull(),
    providerPlayerId: varchar({ length: 32 }).notNull(),
    isPrimary: boolean().notNull().default(false),
    createdAt: timestamp().notNull().defaultNow(),
  },
  table => [
    uniqueIndex("auth_connections_provider_player_idx").on(table.provider, table.providerPlayerId),
    uniqueIndex("auth_connections_primary_idx")
      .on(table.userId)
      .where(sql`${table.isPrimary}`),
    index("auth_connections_user_id_idx").on(table.userId),
  ]
);

export const authSessionsTable = pgTable(
  "auth-sessions",
  {
    id: text().primaryKey(),
    expiresAt: timestamp().notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp()
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => [index("auth_sessions_user_id_idx").on(table.userId)]
);

export const authAccountsTable = pgTable(
  "auth-accounts",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp(),
    refreshTokenExpiresAt: timestamp(),
    scope: text(),
    password: text(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp()
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => [
    index("auth_accounts_user_id_idx").on(table.userId),
    uniqueIndex("auth_accounts_provider_account_idx").on(table.providerId, table.accountId),
  ]
);

export const authVerificationsTable = pgTable(
  "auth-verifications",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp()
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => [index("auth_verifications_identifier_idx").on(table.identifier)]
);

/**
 * The preferences of a user, stored sparsely: only the keys the user changed are present,
 * everything else falls back to the defaults.
 */
export const userPreferencesTable = pgTable("user-preferences", {
  userId: text()
    .primaryKey()
    .references(() => authUsersTable.id, { onDelete: "cascade" }),
  preferences: jsonb().$type<UserPreferencesPatch>().notNull().default({}),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Which players a user follows. Users follow players by their public player id, so a player
 * can be followed without having an account. A user's own follower id is their `playerId`.
 */
export const userFollowsTable = pgTable(
  "user-follows",
  {
    userId: text()
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
    followingPlayerId: varchar({ length: 32 }).notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  table => [
    primaryKey({ columns: [table.userId, table.followingPlayerId] }),
    index("user_follows_following_player_id_idx").on(table.followingPlayerId),
  ]
);

/**
 * The scores a user pinned to the top of their profile. A pin is tied to that exact score, so
 * it keeps showing it after the player improves their score on that map (it then lives in the
 * score history).
 */
export const userPinnedScoresTable = pgTable(
  "user-pinned-scores",
  {
    userId: text()
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
    scoreId: integer().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  table => [primaryKey({ columns: [table.userId, table.scoreId] })]
);

/**
 * The overlays a user built in the overlay editor. The id is random and part of the public OBS url,
 * so it doubles as the secret for reading an overlay.
 */
export const userOverlaysTable = pgTable(
  "user-overlays",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => authUsersTable.id, { onDelete: "cascade" }),
    name: varchar({ length: 64 }).notNull(),
    settings: jsonb().$type<OverlayConnectionSettings>().notNull(),
    layout: jsonb().$type<OverlayLayout>().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp({ precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => [index("user_overlays_user_id_idx").on(table.userId)]
);

/**
 * The accuracy of a BeatLeader score for each second of the song, decoded from its replay (PBOT).
 * A score's replay never changes, so rows are only ever inserted.
 */
export const beatLeaderPbotTable = pgTable("beatleader-pbot", {
  scoreId: integer().primaryKey(),
  /** Accuracy x 100 as integers, null before the first note. */
  accuracyBySecond: jsonb().$type<(number | null)[]>().notNull(),
});

export type TableCountsTableRow = typeof tableCountsTable.$inferSelect;

export type ScoreSaberAccountRow = typeof scoreSaberAccountsTable.$inferSelect;
export type PlayerHistoryRow = typeof playerHistoryTable.$inferSelect;
export type ScoreSaberScoreBaseRow = typeof scoreSaberScoresTable.$inferSelect;
export type ScoreSaberScoreRealmRow = typeof scoreSaberScoreRealmsTable.$inferSelect;
/** A score row resolved for one realm: the base row plus that realm's pp (0 when unranked). */
export type ScoreSaberScoreRow = ScoreSaberScoreBaseRow & { pp: number };
export type ScoreSaberScoreHistoryRow = typeof scoreSaberScoreHistoryTable.$inferSelect;
// The generated full-text search document is internal to the database and never read back.
export type ScoreSaberLeaderboardBaseRow = Omit<
  typeof scoreSaberLeaderboardsTable.$inferSelect,
  "searchVector"
>;
export type ScoreSaberLeaderboardRealmRow = typeof scoreSaberLeaderboardRealmsTable.$inferSelect;
/** A leaderboard row resolved for one realm: the base row plus that realm's ranking state. */
export type ScoreSaberLeaderboardRow = ScoreSaberLeaderboardBaseRow &
  Pick<ScoreSaberLeaderboardRealmRow, "ranked" | "qualified" | "stars" | "rankedDate" | "qualifiedDate">;
export type ScoreSaberLeaderboardStarChangeRow = typeof scoreSaberLeaderboardStarChangeTable.$inferSelect;
export type ScoreSaberReweightRow = typeof scoreSaberReweightsTable.$inferSelect;
export type ScoreSaberReweightPlayerRow = typeof scoreSaberReweightPlayersTable.$inferSelect;
export type ScoreSaberReweightScoreRow = typeof scoreSaberReweightScoresTable.$inferSelect;
export type BeatLeaderScoreRow = typeof beatLeaderScoresTable.$inferSelect;
export type BeatLeaderPlayerRow = typeof beatLeaderPlayersTable.$inferSelect;
export type BeatSaverUploaderRow = typeof beatSaverUploadersTable.$inferSelect;
export type BeatSaverMapRow = typeof beatSaverMapsTable.$inferSelect;
export type BeatSaverMapVersionRow = typeof beatSaverMapVersionsTable.$inferSelect;
export type BeatSaverMapDifficultyRow = typeof beatSaverMapDifficultiesTable.$inferSelect;
export type MetricRow = typeof metricsTable.$inferSelect;
export type AuthUserRow = typeof authUsersTable.$inferSelect;
