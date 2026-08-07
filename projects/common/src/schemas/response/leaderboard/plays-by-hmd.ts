import { Type, type StaticDecode } from "@sinclair/typebox";

export const PlaysByHmdResponseSchema = Type.Record(Type.String(), Type.Number());

export type PlaysByHmdResponse = StaticDecode<typeof PlaysByHmdResponseSchema>;
