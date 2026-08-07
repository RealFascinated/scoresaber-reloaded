import { Type, type StaticDecode } from "@sinclair/typebox";

export const PlayerRefreshResponseSchema = Type.Object({
  result: Type.Boolean(),
});
export type PlayerRefreshResponse = StaticDecode<typeof PlayerRefreshResponseSchema>;
