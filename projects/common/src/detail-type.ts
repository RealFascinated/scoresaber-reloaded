import { Type, type StaticDecode } from "@sinclair/typebox";

const DetailTypeValues = Type.Union([Type.Literal("basic"), Type.Literal("full")], {
  default: "basic",
});

export type DetailType = StaticDecode<typeof DetailTypeValues>;

export const DetailTypeSchema = Type.Unsafe<DetailType>(Type.Optional(DetailTypeValues));
