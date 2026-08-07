import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatSaverAccountTokenSchema } from "./account";
import { BeatSaverMapDifficultyTokenSchema } from "./map-difficulty";

/** Shapes `MapTestplay` (BeatSaver Swagger). */
export const BeatSaverMapTestplaySchema = Type.Object({
  createdAt: Type.Optional(Type.String()),
  feedback: Type.Optional(Type.String()),
  feedbackAt: Type.Optional(Type.String()),
  user: Type.Optional(BeatSaverAccountTokenSchema),
  video: Type.Optional(Type.String()),
});

export type BeatSaverMapTestplay = StaticDecode<typeof BeatSaverMapTestplaySchema>;

export const BeatSaverMapVersionTokenSchema = Type.Object({
  hash: Type.String(),
  stage: Type.Optional(Type.String()),
  state: Type.Optional(
    Type.Union([
      Type.Literal("Uploaded"),
      Type.Literal("Testplay"),
      Type.Literal("Published"),
      Type.Literal("Feedback"),
      Type.Literal("Scheduled"),
    ])
  ),
  createdAt: Type.String(),
  sageScore: Type.Number(),
  feedback: Type.Optional(Type.String()),
  key: Type.Optional(Type.String()),
  scheduledAt: Type.Optional(Type.String()),
  testplayAt: Type.Optional(Type.String()),
  testplays: Type.Optional(Type.Array(BeatSaverMapTestplaySchema)),
  diffs: Type.Array(BeatSaverMapDifficultyTokenSchema),
  downloadURL: Type.String(),
  coverURL: Type.String(),
  previewURL: Type.String(),
});

export type BeatSaverMapVersionToken = StaticDecode<typeof BeatSaverMapVersionTokenSchema>;
