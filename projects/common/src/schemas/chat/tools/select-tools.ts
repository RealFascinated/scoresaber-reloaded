import { Type, type StaticDecode } from "typebox";
import { MapDifficultySchema } from "../../map/map-difficulty";

export const MIN_CHAT_CHOICE_OPTIONS = 2;
export const MAX_CHAT_CHOICE_OPTIONS = 10;

const QuestionSchema = Type.String({
  minLength: 1,
  maxLength: 200,
  description: "One short question shown above the options, for example: Which difficulty did you mean?",
});

export const ChatSelectLeaderboardToolInputSchema = Type.Object({
  question: QuestionSchema,
  leaderboardIds: Type.Array(Type.Integer({ minimum: 1, maximum: 2147483647 }), {
    minItems: MIN_CHAT_CHOICE_OPTIONS,
    maxItems: MAX_CHAT_CHOICE_OPTIONS,
    description:
      "Leaderboard ids from resolveMap or searchMaps to offer, best guess first. Never guess an id.",
  }),
});
export type ChatSelectLeaderboardToolInput = StaticDecode<typeof ChatSelectLeaderboardToolInputSchema>;

export const ChatSelectSongToolInputSchema = Type.Object({
  question: QuestionSchema,
  songHashes: Type.Array(
    Type.String({ minLength: 32, maxLength: 40, pattern: "^(?:[0-9a-fA-F]{32}|[0-9a-fA-F]{40})$" }),
    {
      minItems: MIN_CHAT_CHOICE_OPTIONS,
      maxItems: MAX_CHAT_CHOICE_OPTIONS,
      description: "songHash values from resolveMap or searchMaps to offer, best guess first, one per song.",
    }
  ),
});
export type ChatSelectSongToolInput = StaticDecode<typeof ChatSelectSongToolInputSchema>;

export const ChatLeaderboardOptionSchema = Type.Object({
  leaderboardId: Type.Integer(),
  songHash: Type.String(),
  songName: Type.String(),
  songAuthorName: Type.String(),
  levelAuthorName: Type.String(),
  difficulty: MapDifficultySchema,
  characteristic: Type.String(),
  stars: Type.Number(),
  ranked: Type.Boolean(),
  qualified: Type.Boolean(),
});
export type ChatLeaderboardOption = StaticDecode<typeof ChatLeaderboardOptionSchema>;

export const ChatSongOptionSchema = Type.Object({
  songHash: Type.String(),
  songName: Type.String(),
  songAuthorName: Type.String(),
  levelAuthorName: Type.String(),
  difficultyCount: Type.Integer(),
  maxStars: Type.Number(),
});
export type ChatSongOption = StaticDecode<typeof ChatSongOptionSchema>;

/**
 * The output of selectLeaderboard or selectSong: the chat shows the options and the user's pick is sent as their next message.
 */
export const ChatChoiceSchema = Type.Union([
  Type.Object({
    kind: Type.Literal("leaderboard-choice"),
    question: Type.String(),
    options: Type.Array(ChatLeaderboardOptionSchema),
    note: Type.String(),
  }),
  Type.Object({
    kind: Type.Literal("song-choice"),
    question: Type.String(),
    options: Type.Array(ChatSongOptionSchema),
    note: Type.String(),
  }),
]);
export type ChatChoice = StaticDecode<typeof ChatChoiceSchema>;
