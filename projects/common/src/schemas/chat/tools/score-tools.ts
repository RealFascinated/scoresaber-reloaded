import { Type, type StaticDecode } from "typebox";

export const ChatGetScoreSummaryToolInputSchema = Type.Object({
  scoreId: Type.Optional(
    Type.Integer({
      minimum: 1,
      maximum: 9007199254740991,
      description:
        "ScoreSaber score id from another tool result, for example getPlayerScores or getScoreHistory. Never guess it. Omit it to use the player's current score on leaderboardId.",
    })
  ),
  leaderboardId: Type.Optional(
    Type.Integer({
      minimum: 1,
      maximum: 2147483647,
      description:
        "Leaderboard id from resolveMap, used with playerId to pick the player's current score on that map when no scoreId is given. Never guess it.",
    })
  ),
  playerId: Type.Optional(
    Type.String({
      minLength: 1,
      maxLength: 32,
      description:
        "ScoreSaber player id whose score on leaderboardId to summarize. Omit it to use the signed-in user's linked player. Ignored when scoreId is given.",
    })
  ),
});
export type ChatGetScoreSummaryToolInput = StaticDecode<typeof ChatGetScoreSummaryToolInputSchema>;
