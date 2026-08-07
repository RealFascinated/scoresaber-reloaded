import { Type, type StaticDecode } from "@sinclair/typebox";

export const MedalChangeSchema = Type.Object({
  before: Type.Number(),
  after: Type.Number(),
});
export type MedalChange = StaticDecode<typeof MedalChangeSchema>;
