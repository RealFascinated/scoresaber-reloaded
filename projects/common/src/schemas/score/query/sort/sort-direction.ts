import { Type, type StaticDecode } from "@sinclair/typebox";

export const SortDirectionSchema = Type.Union([Type.Literal("asc"), Type.Literal("desc")]);
export type SortDirection = StaticDecode<typeof SortDirectionSchema>;
