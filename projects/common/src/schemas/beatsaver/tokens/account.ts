import { Type, type StaticDecode } from "@sinclair/typebox";

/** BeatSaver API `UserDetail.type` (Swagger). */
export const BeatSaverAccountTypeSchema = Type.Union([
  Type.Literal("DISCORD"),
  Type.Literal("SIMPLE"),
  Type.Literal("DUAL"),
]);

export type BeatSaverAccountType = StaticDecode<typeof BeatSaverAccountTypeSchema>;

/** BeatSaver API `UserDetail.patreon` (Swagger). */
export const BeatSaverAccountPatreonSchema = Type.Union([
  Type.Literal("None"),
  Type.Literal("Supporter"),
  Type.Literal("SupporterPlus"),
]);

export type BeatSaverAccountPatreon = StaticDecode<typeof BeatSaverAccountPatreonSchema>;

/** BeatSaver API `AccountStandingEntry.status` (Swagger). */
export const BeatSaverAccountStandingStatusSchema = Type.Union([
  Type.Literal("ACTIVE"),
  Type.Literal("REVOKED"),
  Type.Literal("EXPIRED"),
]);

export type BeatSaverAccountStandingStatus = StaticDecode<typeof BeatSaverAccountStandingStatusSchema>;

/** BeatSaver API `AccountStandingEntry.type` / `UserDetail.suspensions` items (Swagger). */
export const BeatSaverAccountStandingTypeSchema = Type.Union([
  Type.Literal("Review"),
  Type.Literal("Upload"),
]);

export type BeatSaverAccountStandingType = StaticDecode<typeof BeatSaverAccountStandingTypeSchema>;

/** Shapes `AccountStandingEntry` (BeatSaver Swagger). */
export const BeatSaverAccountStandingEntrySchema = Type.Object({
  createdAt: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  lengthMinutes: Type.Optional(Type.Number()),
  status: Type.Optional(BeatSaverAccountStandingStatusSchema),
  type: Type.Optional(BeatSaverAccountStandingTypeSchema),
});

export type BeatSaverAccountStandingEntry = StaticDecode<typeof BeatSaverAccountStandingEntrySchema>;

/** Shapes `UserFollowData` (BeatSaver Swagger). */
export const BeatSaverUserFollowDataSchema = Type.Object({
  collab: Type.Optional(Type.Boolean()),
  curation: Type.Optional(Type.Boolean()),
  followers: Type.Optional(Type.Number()),
  following: Type.Optional(Type.Boolean()),
  follows: Type.Optional(Type.Number()),
  upload: Type.Optional(Type.Boolean()),
});

export type BeatSaverUserFollowData = StaticDecode<typeof BeatSaverUserFollowDataSchema>;

/** Shapes `UserStats.diffStats` (BeatSaver Swagger). */
export const BeatSaverUserDiffStatsSchema = Type.Object({
  easy: Type.Optional(Type.Number()),
  expert: Type.Optional(Type.Number()),
  expertPlus: Type.Optional(Type.Number()),
  hard: Type.Optional(Type.Number()),
  normal: Type.Optional(Type.Number()),
  total: Type.Optional(Type.Number()),
});

export type BeatSaverUserDiffStats = StaticDecode<typeof BeatSaverUserDiffStatsSchema>;

/** Shapes `UserStats` (BeatSaver Swagger). */
export const BeatSaverUserStatsSchema = Type.Object({
  avgBpm: Type.Optional(Type.Number()),
  avgDuration: Type.Optional(Type.Number()),
  avgScore: Type.Optional(Type.Number()),
  diffStats: Type.Optional(BeatSaverUserDiffStatsSchema),
  firstUpload: Type.Optional(Type.String()),
  lastUpload: Type.Optional(Type.String()),
  rankedMaps: Type.Optional(Type.Number()),
  totalDownvotes: Type.Optional(Type.Number()),
  totalMaps: Type.Optional(Type.Number()),
  totalPlaylists: Type.Optional(Type.Number()),
  totalUpvotes: Type.Optional(Type.Number()),
});

export type BeatSaverUserStats = StaticDecode<typeof BeatSaverUserStatsSchema>;

/** Shapes `UserDetail` where we use uploader / author in-app (BeatSaver Swagger). */
export const BeatSaverAccountTokenSchema = Type.Object({
  /**
   * The id of the mapper
   */
  id: Type.Number(),

  /**
   * The name of the mapper.
   */
  name: Type.String(),

  /**
   * The account hash of the mapper.
   */
  hash: Type.String(),

  /**
   * The avatar url for the mapper.
   */
  avatar: Type.String(),

  /**
   * The way the account was created
   */
  type: BeatSaverAccountTypeSchema,

  /**
   * Whether the account is an admin or not.
   */
  admin: Type.Boolean(),

  /**
   * Whether the account is a curator or not.
   */
  curator: Type.Boolean(),

  /**
   * Whether the account is a senior curator or not.
   */
  seniorCurator: Type.Boolean(),

  /**
   * Whether the account is a verified mapper or not.
   */
  verifiedMapper: Type.Boolean(),

  /**
   * The playlist for the mappers songs.
   */
  playlistUrl: Type.String(),

  blurnsfw: Type.Optional(Type.Boolean()),
  curatorTab: Type.Optional(Type.Boolean()),
  description: Type.Optional(Type.String()),
  email: Type.Optional(Type.String()),
  patreon: Type.Optional(BeatSaverAccountPatreonSchema),
  testplay: Type.Optional(Type.Boolean()),
  accountStanding: Type.Optional(Type.Array(BeatSaverAccountStandingEntrySchema)),
  followData: Type.Optional(BeatSaverUserFollowDataSchema),
  stats: Type.Optional(BeatSaverUserStatsSchema),
  suspensions: Type.Optional(Type.Array(BeatSaverAccountStandingTypeSchema)),
  uniqueSet: Type.Optional(Type.Boolean()),
  uploadLimit: Type.Optional(Type.Number()),
  vivifyLimit: Type.Optional(Type.Number()),
});

export type BeatSaverAccountToken = StaticDecode<typeof BeatSaverAccountTokenSchema>;
