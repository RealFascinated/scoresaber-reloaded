import { Type, type StaticDecode } from "@sinclair/typebox";

const mapDifficultyShape = Type.Union(
  [
    Type.Literal("Easy"),
    Type.Literal("Normal"),
    Type.Literal("Hard"),
    Type.Literal("Expert"),
    Type.Literal("ExpertPlus"),
  ],
  { default: "Easy" }
);

export type MapDifficulty = StaticDecode<typeof mapDifficultyShape>;

export const MapDifficultySchema = Type.Unsafe<MapDifficulty>(Type.String({ default: "Easy" }));
