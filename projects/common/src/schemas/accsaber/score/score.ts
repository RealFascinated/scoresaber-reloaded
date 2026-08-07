import { Type, type StaticDecode } from "@sinclair/typebox";

/** AccSaber REST API `MyScoreSummary` (nullable `ScoreResponse.myScore`). */
export const ScoreSummarySchema = Type.Object({
  id: Type.String(),
  score: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  accuracy: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  ap: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  weightedAp: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  rank: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  timeSet: Type.Optional(Type.String()),
});

export type ScoreSummary = StaticDecode<typeof ScoreSummarySchema>;

/** AccSaber REST API `MapDifficultyMetadata` (nullable `ScoreResponse.metadata`). */
export const MapDifficultyMetadataSchema = Type.Object({
  bpm: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  notes: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  bombs: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  walls: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  duration: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
});

export type MapDifficultyMetadata = StaticDecode<typeof MapDifficultyMetadataSchema>;

/**
 * AccSaber REST API `ScoreResponse` (GET /v1/users/{userId}/scores).
 *
 * `accuracy` is a 0-1 fraction; `difficulty` is the serialized `Difficulty` enum name
 * (e.g. `EXPERT_PLUS`); `timeSet`/`createdAt` are ISO-8601 strings.
 */
export const ScoreResponseSchema = Type.Object({
  id: Type.String(),
  userId: Type.String(),
  userName: Type.String(),
  avatarUrl: Type.String(),
  cdnAvatarUrl: Type.String(),
  country: Type.String(),
  mapDifficultyId: Type.String(),
  mapId: Type.String(),
  beatsaverCode: Type.String(),
  songHash: Type.String(),
  songName: Type.String(),
  songAuthor: Type.String(),
  mapAuthor: Type.String(),
  coverUrl: Type.String(),
  cdnCoverUrl: Type.String(),
  difficulty: Type.Union([
    Type.Literal("EASY"),
    Type.Literal("NORMAL"),
    Type.Literal("HARD"),
    Type.Literal("EXPERT"),
    Type.Literal("EXPERT_PLUS"),
  ]),
  characteristic: Type.String(),
  categoryId: Type.String(),
  complexity: Type.Number(),
  score: Type.Number(),
  scoreNoMods: Type.Number(),
  accuracy: Type.Number(),
  rank: Type.Number(),
  rankWhenSet: Type.Number(),
  ap: Type.Number(),
  weightedAp: Type.Number(),
  blScoreId: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  ssScoreId: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  maxCombo: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  badCuts: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  misses: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  wallHits: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  bombHits: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  pauses: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  streak115: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  maxStreak115: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  playCount: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  hmd: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  timeSet: Type.String(),
  reweightDerivative: Type.Boolean(),
  xpGained: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  baseXp: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  bonusXp: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  active: Type.Boolean(),
  partial: Type.Boolean(),
  supersedesReason: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  modifierIds: Type.Optional(Type.Array(Type.String())),
  createdAt: Type.String(),
  myScore: Type.Optional(ScoreSummarySchema),
  supporterTier: Type.Optional(Type.String()),
  skillLevel: Type.Optional(Type.Number()),
  metadata: Type.Optional(MapDifficultyMetadataSchema),
  nps: Type.Optional(Type.Number()),
});

export type ScoreResponse = StaticDecode<typeof ScoreResponseSchema>;
