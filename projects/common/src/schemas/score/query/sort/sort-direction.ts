import { Type, type StaticDecode } from "typebox";

export const SortDirectionSchema = Type.Union([Type.Literal("asc"), Type.Literal("desc")]);
export type SortDirection = StaticDecode<typeof SortDirectionSchema>;
