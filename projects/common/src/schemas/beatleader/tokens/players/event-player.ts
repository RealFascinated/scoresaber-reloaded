import { Type, type StaticDecode } from "@sinclair/typebox";

/**
 * Raw `EventRanking` token mirroring the upstream `EventRanking` schema.
 * `eventType` is serialized as a number by the API even though the generated
 * OpenAPI documents it as a string.
 */
export const BeatLeaderEventRankingSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  endDate: Type.Number(),
  playlistId: Type.Number(),
  image: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  animatedImage: Type.Union([Type.String(), Type.Null()]),
  mainColor: Type.String(),
  secondaryColor: Type.String(),
  pageAlias: Type.Union([Type.String(), Type.Null()]),
  eventType: Type.Number(),
});

export type BeatLeaderEventRankingToken = StaticDecode<typeof BeatLeaderEventRankingSchema>;

/**
 * Raw `MapOfTheDay` token mirroring the upstream `MapOfTheDay` schema. The
 * upstream `song` (a full `Song`), `leaderboards` (array of `Leaderboard`) and
 * `champions` (array of `EventPlayer`) references are recursive and are omitted.
 */
export const BeatLeaderMapOfTheDaySchema = Type.Object({
  id: Type.Number(),
  songId: Type.Union([Type.String(), Type.Null()]),
  timestart: Type.Number(),
  timeend: Type.Number(),
  description: Type.Union([Type.String(), Type.Null()]),
  eventRanking: Type.Union([BeatLeaderEventRankingSchema, Type.Null()]),
});

export type BeatLeaderMapOfTheDayToken = StaticDecode<typeof BeatLeaderMapOfTheDaySchema>;

/**
 * Raw `MapOfTheDayPoints` token mirroring the upstream `MapOfTheDayPoints`
 * schema.
 */
export const BeatLeaderMapOfTheDayPointsSchema = Type.Object({
  id: Type.Number(),
  points: Type.Number(),
  rank: Type.Number(),
  mapOfTheDay: BeatLeaderMapOfTheDaySchema,
});

export type BeatLeaderMapOfTheDayPointsToken = StaticDecode<typeof BeatLeaderMapOfTheDayPointsSchema>;

/**
 * Raw `EventPlayer` token mirroring the upstream `EventPlayer` schema. This is
 * the item type of `Player.eventsParticipating`.
 */
export const BeatLeaderEventPlayerSchema = Type.Object({
  id: Type.Number(),
  eventRankingId: Type.Union([Type.Number(), Type.Null()]),
  event: BeatLeaderEventRankingSchema,
  eventName: Type.String(),
  playerName: Type.String(),
  playerId: Type.String(),
  country: Type.String(),
  rank: Type.Number(),
  countryRank: Type.Number(),
  pp: Type.Number(),
  mapOfTheDays: Type.Array(BeatLeaderMapOfTheDaySchema),
  mapOfTheDayPoints: Type.Array(BeatLeaderMapOfTheDayPointsSchema),
});

export type BeatLeaderEventPlayerToken = StaticDecode<typeof BeatLeaderEventPlayerSchema>;
