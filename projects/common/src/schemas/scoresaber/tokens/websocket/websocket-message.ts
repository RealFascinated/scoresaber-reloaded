import { Type, type StaticDecode } from "typebox";

export const ScoreSaberWebsocketMessageTokenSchema = Type.Object({
  commandName: Type.Literal("score"),

  // Old type was `any` — ScoreSaber sends unmodeled commands.
  commandData: Type.Unknown(),
});

export type ScoreSaberWebsocketMessageToken = StaticDecode<typeof ScoreSaberWebsocketMessageTokenSchema>;
