import { Type, type Static } from "typebox";

const suggestedMapsFilterFields = {
  minStars: Type.Optional(Type.Number({ minimum: 0 })),
  maxStars: Type.Optional(Type.Number({ minimum: 0 })),
  minSeconds: Type.Optional(Type.Number({ minimum: 0 })),
  maxSeconds: Type.Optional(Type.Number({ minimum: 0 })),
  maxNps: Type.Optional(Type.Number({ minimum: 0 })),
  /** Maps with fewer scores than this are skipped, their ease is mostly a guess. */
  minScores: Type.Optional(Type.Integer({ minimum: 0 })),
  /** The accuracy of the reference player (used without a player). */
  referenceAccuracy: Type.Optional(Type.Number({ minimum: 80, maximum: 99.9 })),
  hidePlayed: Type.Optional(Type.Boolean()),
  sort: Type.Optional(Type.Union([Type.Literal("gain"), Type.Literal("bonus")])),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })),
  /** Pick a different set of maps every UTC day from a wider pool, instead of always the best. */
  daily: Type.Optional(Type.Boolean()),
};

export const SuggestedMapsQuerySchema = Type.Object({
  /** Rank the maps for this player's pp list. Without it a reference player is used. */
  playerId: Type.Optional(Type.String()),
  ...suggestedMapsFilterFields,
});

/** The filters of the suggested maps playlist of a player (the player is in the path). */
export const SuggestedMapsPlaylistQuerySchema = Type.Object(suggestedMapsFilterFields);

export type SuggestedMapsPlaylistQuery = Static<typeof SuggestedMapsPlaylistQuerySchema>;
