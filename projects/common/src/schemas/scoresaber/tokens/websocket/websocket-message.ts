import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreSaberWebsocketMessageTokenSchema = Type.Object({
  /**
   * Command name
   */
  commandName: Type.Literal("score"),

  /**
   * Command data
   */
  // Old type was `any` — ScoreSaber sends unmodeled commands.
  commandData: Type.Unknown(),
});

export type ScoreSaberWebsocketMessageToken = StaticDecode<typeof ScoreSaberWebsocketMessageTokenSchema>;
