import { Type } from "typebox";
import {
  SelfPlaylistSortDirectionSchema,
  SelfPlaylistSortFieldSchema,
} from "../../../playlist/self/self-playlist-settings-schema";
import { MapCharacteristicSchema } from "../../map/map-characteristic";
import { MapDifficultySchema } from "../../map/map-difficulty";
import { ScoreSaberScoreSortFieldSchema } from "../../score/query/sort/scoresaber-scores-sort";
import { SortDirectionSchema } from "../../score/query/sort/sort-direction";
import {
  ScoreSaberLeaderboardQueryCategorySchema,
  ScoreSaberLeaderboardQuerySortSchema,
} from "../../scoresaber/leaderboard/query-filters";

const starRangeSchema = Type.Object({
  min: Type.Number({ minimum: 0, maximum: 20 }),
  max: Type.Number({ minimum: 0, maximum: 20 }),
});

const accuracyRangeSchema = Type.Object({
  min: Type.Number({ minimum: 0, maximum: 100 }),
  max: Type.Number({ minimum: 0, maximum: 100 }),
});

const rankedStatusSchema = Type.Union([
  Type.Literal("all"),
  Type.Literal("ranked"),
  Type.Literal("unranked"),
]);

const PlayerIdSchema = Type.String({
  minLength: 1,
  maxLength: 32,
  description: "ScoreSaber player id. Omit it to use the signed-in user's linked player.",
});

const PageSchema = Type.Integer({
  minimum: 1,
  maximum: 1000,
  description: "1-based page number.",
});

const SongHashSchema = Type.String({
  minLength: 32,
  maxLength: 40,
  pattern: "^(?:[0-9a-fA-F]{32}|[0-9a-fA-F]{40})$",
  description: "BeatSaver song hash (32 or 40 hex characters).",
});

export const GetLeaderboardInputSchema = Type.Object({
  leaderboardId: Type.Integer({
    minimum: 1,
    maximum: 2147483647,
    description: "ScoreSaber leaderboard id. Get it from resolveMap or searchMaps first; never guess an id.",
  }),
});

export const GetLeaderboardScoresInputSchema = Type.Object({
  leaderboardId: Type.Integer({
    minimum: 1,
    maximum: 2147483647,
    description: "ScoreSaber leaderboard id from resolveMap or searchMaps.",
  }),
  page: Type.Optional(PageSchema),
});

export const SearchMapsInputSchema = Type.Object({
  query: Type.Optional(
    Type.String({ minLength: 1, maxLength: 100, description: "Song or mapper name to search for." })
  ),
  minStars: Type.Optional(Type.Number({ minimum: 0, maximum: 20, description: "Lowest star rating." })),
  maxStars: Type.Optional(Type.Number({ minimum: 0, maximum: 20, description: "Highest star rating." })),
  ranked: Type.Optional(Type.Boolean({ description: "Only ranked maps when true." })),
  qualified: Type.Optional(Type.Boolean({ description: "Only qualified maps when true." })),
  category: Type.Optional(ScoreSaberLeaderboardQueryCategorySchema),
  sort: Type.Optional(ScoreSaberLeaderboardQuerySortSchema),
  page: Type.Optional(PageSchema),
});

export const ResolveMapInputSchema = Type.Object({
  query: Type.String({
    minLength: 1,
    maxLength: 100,
    description:
      "Map name, song hash (32 or 40 hex characters) or BeatSaver key. Use this before any tool that takes a leaderboard id.",
  }),
});

export const GetBeatSaverMapInputSchema = Type.Object({
  hashOrKey: Type.String({
    minLength: 1,
    maxLength: 40,
    pattern: "^(?:[0-9a-fA-F]{1,8}|[0-9a-fA-F]{32}|[0-9a-fA-F]{40})$",
    description: "BeatSaver song hash (32 or 40 hex characters) or BeatSaver map key.",
  }),
});

export const GetSuggestedMapsInputSchema = Type.Object({
  playerId: Type.Optional(PlayerIdSchema),
  minStars: Type.Optional(Type.Number({ minimum: 0, maximum: 20 })),
  maxStars: Type.Optional(Type.Number({ minimum: 0, maximum: 20 })),
  minSeconds: Type.Optional(Type.Number({ minimum: 0, maximum: 36000 })),
  maxSeconds: Type.Optional(Type.Number({ minimum: 0, maximum: 36000 })),
  maxNps: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
  minScores: Type.Optional(Type.Integer({ minimum: 0, maximum: 1000000 })),
  hidePlayed: Type.Optional(Type.Boolean()),
  sort: Type.Optional(Type.Union([Type.Literal("gain"), Type.Literal("bonus")])),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 25 })),
});

export const GetRankedBatchesInputSchema = Type.Object({
  page: Type.Optional(PageSchema),
});

export const GetRankedBatchInputSchema = Type.Object({
  rankedBatchId: Type.Integer({
    minimum: 1,
    maximum: 2147483647,
    description: "Ranked batch id from getRankedBatches.",
  }),
});

export const GetSiteLinkInputSchema = Type.Object({
  kind: Type.Union([
    Type.Literal("player", { description: "A player profile page." }),
    Type.Literal("leaderboard", { description: "A leaderboard page." }),
    Type.Literal("score", { description: "A score page." }),
  ]),
  id: Type.String({
    minLength: 1,
    maxLength: 100,
    description: "Player id, leaderboard id or score id for the chosen page kind.",
  }),
});

export const GetRealmsInputSchema = Type.Object({});

export const SelfPlaylistToolSettingsSchema = Type.Object({
  sort: Type.Optional(SelfPlaylistSortFieldSchema),
  sortDirection: Type.Optional(SelfPlaylistSortDirectionSchema),
  rankedStatus: Type.Optional(rankedStatusSchema),
  starRange: Type.Optional(starRangeSchema),
  accuracyRange: Type.Optional(accuracyRangeSchema),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })),
});

export const SnipePlaylistToolSettingsSchema = Type.Object({
  sort: Type.Optional(ScoreSaberScoreSortFieldSchema),
  sortDirection: Type.Optional(SortDirectionSchema),
  rankedStatus: Type.Optional(rankedStatusSchema),
  requireBothScores: Type.Optional(Type.Boolean()),
  starRange: Type.Optional(starRangeSchema),
  accuracyRange: Type.Optional(accuracyRangeSchema),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })),
});

export const GetSelfPlaylistInputSchema = Type.Object({
  playerId: Type.Optional(PlayerIdSchema),
  settings: Type.Optional(SelfPlaylistToolSettingsSchema),
});

export const GetSnipePlaylistInputSchema = Type.Object({
  playerId: Type.Optional(PlayerIdSchema),
  targetId: Type.String({
    minLength: 1,
    maxLength: 32,
    description: "Player id of the player being sniped.",
  }),
  settings: Type.Optional(SnipePlaylistToolSettingsSchema),
});

export const GetSuggestedMapsPlaylistInputSchema = Type.Object({
  playerId: Type.Optional(PlayerIdSchema),
  filters: Type.Optional(
    Type.Object({
      minStars: Type.Optional(Type.Number({ minimum: 0, maximum: 20 })),
      maxStars: Type.Optional(Type.Number({ minimum: 0, maximum: 20 })),
      minSeconds: Type.Optional(Type.Number({ minimum: 0, maximum: 36000 })),
      maxSeconds: Type.Optional(Type.Number({ minimum: 0, maximum: 36000 })),
      maxNps: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
      minScores: Type.Optional(Type.Integer({ minimum: 0, maximum: 1000000 })),
      referenceAccuracy: Type.Optional(Type.Number({ minimum: 80, maximum: 99.9 })),
      hidePlayed: Type.Optional(Type.Boolean()),
      sort: Type.Optional(Type.Union([Type.Literal("gain"), Type.Literal("bonus")])),
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200 })),
    })
  ),
});

export const GetRankedBatchPlaylistInputSchema = Type.Object({
  rankedBatchId: Type.Integer({
    minimum: 1,
    maximum: 2147483647,
    description: "Ranked batch id from getRankedBatches.",
  }),
});

export const GetRankedMapsPlaylistInputSchema = Type.Object({
  kind: Type.Union([
    Type.Literal("ranked", { description: "Every currently ranked map." }),
    Type.Literal("qualified", { description: "Every currently qualified map." }),
    Type.Literal("ranking-queue", { description: "Maps in the ranking queue." }),
    Type.Literal("trending", { description: "The most played maps right now." }),
  ]),
});

export const CreatePlaylistMapSchema = Type.Union([
  Type.Object({
    leaderboardId: Type.Integer({
      minimum: 1,
      description: "ScoreSaber leaderboard id from resolveMap or searchMaps.",
    }),
  }),
  Type.Object({
    songHash: SongHashSchema,
    difficulty: MapDifficultySchema,
    characteristic: Type.Optional(MapCharacteristicSchema),
  }),
]);

export const CreatePlaylistInputSchema = Type.Object({
  title: Type.String({
    minLength: 1,
    maxLength: 100,
    description: "Playlist title shown in game.",
  }),
  description: Type.Optional(Type.String({ maxLength: 500, description: "Optional playlist description." })),
  maps: Type.Array(CreatePlaylistMapSchema, {
    minItems: 1,
    maxItems: 100,
    description:
      "Maps to include, at most 100. Prefer leaderboardId from resolveMap; songHash plus difficulty also works.",
  }),
});
