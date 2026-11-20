import { Type, type StaticDecode } from "typebox";
import { HmdSchema } from "../../hmd";

const PlayerIdSchema = Type.String({
  minLength: 1,
  maxLength: 32,
  description:
    "ScoreSaber player id, always a JSON string in quotes (never a number, long ids lose digits as numbers). Omit it to use the signed-in user's linked player. Use searchPlayers first if you only have a name.",
});

const PageSchema = Type.Integer({
  minimum: 1,
  maximum: 1000,
  description: "1-based page number.",
});

const CountrySchema = Type.String({
  minLength: 2,
  maxLength: 3,
  description: "ISO 3166-1 alpha-2 country code, for example SE or US.",
});

export const ChatSearchPlayersToolInputSchema = Type.Object({
  query: Type.String({
    minLength: 4,
    maxLength: 64,
    description: "Player name, or part of it, to search for.",
  }),
});
export type ChatSearchPlayersToolInput = StaticDecode<typeof ChatSearchPlayersToolInputSchema>;

export const ChatGetPlayerToolInputSchema = Type.Object({
  playerId: Type.Optional(PlayerIdSchema),
});
export type ChatGetPlayerToolInput = StaticDecode<typeof ChatGetPlayerToolInputSchema>;

export const ChatGetPlayerPerformanceToolInputSchema = Type.Object({
  playerId: Type.Optional(PlayerIdSchema),
});
export type ChatGetPlayerPerformanceToolInput = StaticDecode<typeof ChatGetPlayerPerformanceToolInputSchema>;

export const ChatCalculatePpToolInputSchema = Type.Object({
  stars: Type.Number({
    minimum: 0,
    maximum: 20,
    description: "Star rating of the map, for example 7.5.",
  }),
  accuracies: Type.Array(
    Type.Number({
      minimum: 0,
      maximum: 100,
      description: "Accuracy as a percent, for example 97.4.",
    }),
    {
      minItems: 1,
      maxItems: 10,
      description: "Accuracies to calculate pp for, as percents.",
    }
  ),
  playerId: Type.Optional(PlayerIdSchema),
  leaderboardId: Type.Optional(
    Type.Integer({
      minimum: 1,
      maximum: 2147483647,
      description:
        "Leaderboard id from resolveMap to treat the score as replacing the player's existing score on that map. Never guess it.",
    })
  ),
});
export type ChatCalculatePpToolInput = StaticDecode<typeof ChatCalculatePpToolInputSchema>;

export const ChatGetPlayerScoresToolInputSchema = Type.Object({
  playerId: Type.Optional(PlayerIdSchema),
  sort: Type.Optional(
    Type.Union([Type.Literal("top"), Type.Literal("recent")], {
      description: "top = highest pp first, recent = newest first. Defaults to recent.",
    })
  ),
  page: Type.Optional(PageSchema),
  search: Type.Optional(
    Type.String({ maxLength: 100, description: "Only scores whose map name contains this text." })
  ),
  hmd: Type.Optional(HmdSchema),
});
export type ChatGetPlayerScoresToolInput = StaticDecode<typeof ChatGetPlayerScoresToolInputSchema>;

export const ChatGetPlayerHistoryToolInputSchema = Type.Object({
  playerId: Type.Optional(PlayerIdSchema),
  days: Type.Optional(
    Type.Integer({
      minimum: 1,
      maximum: 90,
      description: "Number of calendar days to include, ending today. Defaults to 14.",
    })
  ),
});
export type ChatGetPlayerHistoryToolInput = StaticDecode<typeof ChatGetPlayerHistoryToolInputSchema>;

export const ChatGetPlayerRankingToolInputSchema = Type.Object({
  country: Type.Optional(CountrySchema),
  page: Type.Optional(PageSchema),
});
export type ChatGetPlayerRankingToolInput = StaticDecode<typeof ChatGetPlayerRankingToolInputSchema>;

export const ChatGetScoreHistoryToolInputSchema = Type.Object({
  playerId: Type.Optional(PlayerIdSchema),
  leaderboardId: Type.Integer({
    minimum: 1,
    maximum: 2147483647,
    description: "Leaderboard id from resolveMap. Never guess it from a map name or difficulty.",
  }),
});
export type ChatGetScoreHistoryToolInput = StaticDecode<typeof ChatGetScoreHistoryToolInputSchema>;

export const ChatComparePlayersToolInputSchema = Type.Object({
  a: Type.String({
    minLength: 1,
    maxLength: 32,
    description: "First ScoreSaber player id. Resolve names with searchPlayers first.",
  }),
  b: Type.String({
    minLength: 1,
    maxLength: 32,
    description: "Second ScoreSaber player id. Resolve names with searchPlayers first.",
  }),
});
export type ChatComparePlayersToolInput = StaticDecode<typeof ChatComparePlayersToolInputSchema>;

export const ChatGetFollowingToolInputSchema = Type.Object({});
export type ChatGetFollowingToolInput = StaticDecode<typeof ChatGetFollowingToolInputSchema>;

export const ChatGetMedalsToolInputSchema = Type.Object({
  playerId: Type.Optional(PlayerIdSchema),
});
export type ChatGetMedalsToolInput = StaticDecode<typeof ChatGetMedalsToolInputSchema>;
