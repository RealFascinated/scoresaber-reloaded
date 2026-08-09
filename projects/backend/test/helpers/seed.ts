import { stringify } from "devalue";
import { sql } from "drizzle-orm";
import { cachedPlayerTokenCacheKey } from "../../src/common/cache-keys";
import { redisClient } from "../../src/common/redis";
import { db } from "../../src/db/index";
import {
  beatLeaderPlayersTable,
  beatLeaderScoresTable,
  beatSaverMapDifficultiesTable,
  beatSaverMapsTable,
  beatSaverMapVersionsTable,
  beatSaverUploadersTable,
  playerHistoryTable,
  scoreSaberAccountsTable,
  scoreSaberLeaderboardsTable,
  scoreSaberLeaderboardStarChangeTable,
  scoreSaberScoreHistoryTable,
  scoreSaberScoresTable,
} from "../../src/db/schema";
import {
  TEST_AVATAR,
  TEST_BEATLEADER_SCORE_ID,
  TEST_INACTIVE_PLAYER_ID,
  TEST_LEADERBOARD_ID,
  TEST_LEADERBOARD_QUALIFIED_ID,
  TEST_PLAYER_ID,
  TEST_PLAYER_NAME,
  TEST_PLAYER_TWO_ID,
  TEST_PLAYER_TWO_NAME,
  TEST_SCORE_HISTORY_ID,
  TEST_SCORE_ID,
  TEST_SCORE_TWO_ID,
  TEST_SONG_HASH,
  TEST_SONG_HASH_SHA1,
  TEST_SONG_HASH_TWO,
} from "./constants";
import { buildScoreSaberV2PlayerToken } from "./fixtures";

const seededTables = [
  "scoresaber-player-history",
  "scoresaber-score-history",
  "scoresaber-leaderboard-star-change",
  "scoresaber-scores",
  "scoresaber-leaderboards",
  "scoresaber-accounts",
  "beatleader-scores",
  "beatleader-players",
  "beatsaver-map-difficulties",
  "beatsaver-map-versions",
  "beatsaver-maps",
  "beatsaver-uploaders",
] as const;

const now = new Date("2024-06-01T12:00:00.000Z");

export async function truncateTestTables(): Promise<void> {
  const tableList = seededTables.map(table => `"${table}"`).join(", ");
  await db.execute(sql.raw(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`));
}

export async function seedTestDatabase(): Promise<void> {
  await db.insert(scoreSaberAccountsTable).values([
    {
      id: TEST_PLAYER_ID,
      name: TEST_PLAYER_NAME,
      country: "US",
      avatar: TEST_AVATAR,
      seededScores: true,
      seededBeatLeaderScores: true,
      trackReplays: false,
      inactive: false,
      banned: false,
      pp: 100,
      medals: 5,
      trackedSince: now,
      joinedDate: now,
    },
    {
      id: TEST_PLAYER_TWO_ID,
      name: TEST_PLAYER_TWO_NAME,
      country: "US",
      avatar: TEST_AVATAR,
      seededScores: true,
      seededBeatLeaderScores: true,
      trackReplays: false,
      inactive: false,
      banned: false,
      pp: 80,
      medals: 2,
      trackedSince: now,
      joinedDate: now,
    },
    {
      id: TEST_INACTIVE_PLAYER_ID,
      name: "InactivePlayer",
      country: "US",
      avatar: TEST_AVATAR,
      seededScores: true,
      seededBeatLeaderScores: true,
      trackReplays: false,
      inactive: true,
      banned: false,
      pp: 50,
      medals: 1,
      trackedSince: now,
      joinedDate: now,
    },
  ]);

  await db.insert(scoreSaberLeaderboardsTable).values([
    {
      id: TEST_LEADERBOARD_ID,
      songHash: TEST_SONG_HASH,
      songName: "Test Song",
      songSubName: "Test Sub",
      songAuthorName: "Test Author",
      levelAuthorName: "Test Mapper",
      difficulty: "ExpertPlus",
      characteristic: "Standard",
      maxScore: 1000,
      ranked: true,
      qualified: false,
      stars: 8.5,
      rankedDate: now,
      plays: 100,
      dailyPlays: 10,
      seededScores: true,
      trendingScore: 1,
      timestamp: now,
    },
    {
      id: TEST_LEADERBOARD_QUALIFIED_ID,
      songHash: TEST_SONG_HASH_TWO,
      songName: "Qualified Song",
      songSubName: "Qualified Sub",
      songAuthorName: "Qualified Author",
      levelAuthorName: "Qualified Mapper",
      difficulty: "Expert",
      characteristic: "Standard",
      maxScore: 900,
      ranked: false,
      qualified: true,
      stars: 6.5,
      qualifiedDate: now,
      plays: 50,
      dailyPlays: 5,
      seededScores: true,
      trendingScore: 2,
      timestamp: now,
    },
  ]);

  await db.insert(scoreSaberScoresTable).values([
    {
      scoreId: TEST_SCORE_ID,
      playerId: TEST_PLAYER_ID,
      leaderboardId: TEST_LEADERBOARD_ID,
      difficulty: "ExpertPlus",
      characteristic: "Standard",
      score: 950,
      accuracy: 0.95,
      pp: 250,
      medals: 1,
      missedNotes: 0,
      badCuts: 1,
      maxCombo: 500,
      fullCombo: false,
      modifiers: [],
      timestamp: now,
    },
    {
      scoreId: TEST_SCORE_TWO_ID,
      playerId: TEST_PLAYER_TWO_ID,
      leaderboardId: TEST_LEADERBOARD_ID,
      difficulty: "ExpertPlus",
      characteristic: "Standard",
      score: 900,
      accuracy: 0.9,
      pp: 200,
      medals: 1,
      missedNotes: 1,
      badCuts: 2,
      maxCombo: 450,
      fullCombo: false,
      modifiers: [],
      timestamp: now,
    },
  ]);

  await db.insert(scoreSaberScoreHistoryTable).values({
    scoreId: TEST_SCORE_HISTORY_ID,
    playerId: TEST_PLAYER_ID,
    leaderboardId: TEST_LEADERBOARD_ID,
    difficulty: "ExpertPlus",
    characteristic: "Standard",
    score: 800,
    accuracy: 0.9,
    pp: 0,
    medals: 0,
    missedNotes: 1,
    badCuts: 1,
    maxCombo: 400,
    fullCombo: false,
    modifiers: [],
    timestamp: new Date("2024-05-01T12:00:00.000Z"),
  });

  await db.insert(playerHistoryTable).values([
    {
      playerId: TEST_PLAYER_ID,
      date: now,
      rank: 100,
      countryRank: 10,
      medals: 5,
      pp: 100,
      plusOnePp: 1,
      totalScore: 1000,
      totalRankedScore: 1000,
      rankedScores: 1,
      unrankedScores: 0,
      rankedScoresImproved: 0,
      unrankedScoresImproved: 0,
      totalRankedScores: 1,
      totalUnrankedScores: 0,
      totalScores: 1,
      averageRankedAccuracy: 0.95,
      averageUnrankedAccuracy: 0,
      averageAccuracy: 0.95,
      aPlays: 0,
      sPlays: 0,
      spPlays: 0,
      ssPlays: 1,
      sspPlays: 0,
      godPlays: 0,
    },
    {
      playerId: TEST_PLAYER_ID,
      date: new Date("2024-05-01T00:00:00.000Z"),
      rank: 110,
      countryRank: 12,
      medals: 4,
      pp: 95,
      plusOnePp: 1,
      totalScore: 900,
      totalRankedScore: 900,
      rankedScores: 1,
      unrankedScores: 0,
      rankedScoresImproved: 0,
      unrankedScoresImproved: 0,
      totalRankedScores: 1,
      totalUnrankedScores: 0,
      totalScores: 1,
      averageRankedAccuracy: 0.9,
      averageUnrankedAccuracy: 0,
      averageAccuracy: 0.9,
      aPlays: 0,
      sPlays: 0,
      spPlays: 0,
      ssPlays: 1,
      sspPlays: 0,
      godPlays: 0,
    },
  ]);

  await db.insert(scoreSaberLeaderboardStarChangeTable).values({
    leaderboardId: TEST_LEADERBOARD_ID,
    previousStars: 8.0,
    newStars: 8.5,
    timestamp: now,
  });

  await db.insert(beatSaverUploadersTable).values({
    id: 1,
    name: "TestMapper",
    hash: "testmapper",
    avatar: TEST_AVATAR,
    type: "SIMPLE",
    admin: false,
    curator: false,
    seniorCurator: false,
    verifiedMapper: false,
    playlistUrl: "",
  });

  await db.insert(beatSaverMapsTable).values({
    id: "testmap",
    name: "Test Song",
    description: "Integration test map",
    uploaderId: 1,
    bpm: 120,
    duration: 180,
    songName: "Test Song",
    songSubName: "Test Sub",
    songAuthorName: "Test Author",
    levelAuthorName: "Test Mapper",
    uploadedAt: now,
    automapper: false,
    createdAt: now,
    updatedAt: now,
    lastPublishedAt: now,
    tags: [],
  });

  const [version] = await db
    .insert(beatSaverMapVersionsTable)
    .values({
      mapId: "testmap",
      hash: TEST_SONG_HASH,
      stage: "published",
      createdAt: now,
      downloadUrl: "https://example.com/map.zip",
      coverUrl: "https://example.com/cover.jpg",
      previewUrl: "https://example.com/preview.mp3",
    })
    .returning({ id: beatSaverMapVersionsTable.id });

  await db.insert(beatSaverMapDifficultiesTable).values({
    versionId: version.id,
    characteristic: "Standard",
    difficulty: "ExpertPlus",
    njs: 20,
    offset: 0,
    notes: 1000,
    bombs: 10,
    obstacles: 5,
    nps: 10,
    length: 200,
    events: 0,
    chroma: false,
    mappingExtensions: false,
    noodleExtensions: false,
    cinema: false,
    seconds: 180,
    maxScore: 1000,
    label: "Expert+",
  });

  // A second map whose version hash uses the current 40-character (SHA1) style,
  // covering the "new hash" path through the BeatSaver cache.
  await db.insert(beatSaverMapsTable).values({
    id: "testmap-sha1",
    name: "Test Song SHA1",
    description: "Integration test map with SHA1 hash",
    uploaderId: 1,
    bpm: 130,
    duration: 200,
    songName: "Test Song SHA1",
    songSubName: "Test Sub",
    songAuthorName: "Test Author",
    levelAuthorName: "Test Mapper",
    uploadedAt: now,
    automapper: false,
    createdAt: now,
    updatedAt: now,
    lastPublishedAt: now,
    tags: [],
  });

  const [sha1Version] = await db
    .insert(beatSaverMapVersionsTable)
    .values({
      mapId: "testmap-sha1",
      hash: TEST_SONG_HASH_SHA1,
      stage: "published",
      createdAt: now,
      downloadUrl: "https://example.com/map-sha1.zip",
      coverUrl: "https://example.com/cover-sha1.jpg",
      previewUrl: "https://example.com/preview-sha1.mp3",
    })
    .returning({ id: beatSaverMapVersionsTable.id });

  await db.insert(beatSaverMapDifficultiesTable).values({
    versionId: sha1Version.id,
    characteristic: "Standard",
    difficulty: "ExpertPlus",
    njs: 20,
    offset: 0,
    notes: 1000,
    bombs: 10,
    obstacles: 5,
    nps: 10,
    length: 200,
    events: 0,
    chroma: false,
    mappingExtensions: false,
    noodleExtensions: false,
    cinema: false,
    seconds: 180,
    maxScore: 1000,
    label: "Expert+",
  });

  await db.insert(beatLeaderPlayersTable).values({
    id: TEST_PLAYER_ID,
    name: TEST_PLAYER_NAME,
    platform: "steam",
    lastFetched: now,
  });

  await db.insert(beatLeaderScoresTable).values({
    id: TEST_BEATLEADER_SCORE_ID,
    playerId: TEST_PLAYER_ID,
    songHash: TEST_SONG_HASH,
    leaderboardId: String(TEST_LEADERBOARD_ID),
    songDifficulty: "ExpertPlus",
    songCharacteristic: "Standard",
    songScore: 950,
    pauses: 0,
    fcAccuracy: 0.95,
    fullCombo: false,
    savedReplay: true,
    leftHandAccuracy: 0.94,
    rightHandAccuracy: 0.96,
    misses: 1,
    missedNotes: 1,
    bombCuts: 0,
    wallsHit: 0,
    badCuts: 0,
    improvementScore: 0,
    improvementPauses: 0,
    improvementMisses: 0,
    improvementMissedNotes: 0,
    improvementBombCuts: 0,
    improvementWallsHit: 0,
    improvementBadCuts: 0,
    improvementLeftHandAccuracy: 0,
    improvementRightHandAccuracy: 0,
    timestamp: now,
  });
}

export async function seedCachedScoreSaberPlayerTokens(): Promise<void> {
  const tokens = [
    buildScoreSaberV2PlayerToken(),
    buildScoreSaberV2PlayerToken({
      id: TEST_PLAYER_TWO_ID,
      name: TEST_PLAYER_TWO_NAME,
      playerNameInGame: TEST_PLAYER_TWO_NAME,
      stats: {
        realmId: 1,
        realmName: "Steam",
        rank: 200,
        countryRank: 20,
        rankChange: null,
        totalPP: 80,
        plusOnePP: 1,
        totalScore: "800",
        totalRankedScore: "800",
        totalPlayedLeaderboards: 1,
        totalPlayedRankedLeaderboards: 1,
        totalSubmittedPlays: 1,
        totalReplayViews: 0,
        averageAccuracy: 0.9,
        weightedAverageAccuracy: 0.9,
        completionAccuracy: 0.9,
        device: null,
      },
    }),
  ];

  await Promise.all(
    tokens.map(token => redisClient.set(cachedPlayerTokenCacheKey(token.id), stringify(token), "EX", 60 * 60))
  );
}
