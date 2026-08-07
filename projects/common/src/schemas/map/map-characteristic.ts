import { Type, type StaticDecode } from "@sinclair/typebox";

export const base = Type.Union([
  Type.Literal("Standard"),
  Type.Literal("OneSaber"),
  Type.Literal("NoArrows"),
  Type.Literal("Lawless"),
  Type.Literal("90Degree"),
  Type.Literal("360Degree"),
  Type.Literal("Lightshow"),
  Type.Literal("Legacy"),
  Type.Literal("MissingCharacteristic"),
]);

const mapCharacteristicShape = Type.Union(
  [
    base,

    Type.TemplateLiteral([Type.Literal("Generated"), base]),
    Type.TemplateLiteral([Type.Literal("Inverse"), base]),
    Type.TemplateLiteral([Type.Literal("Inverted"), base]),
    Type.TemplateLiteral([Type.Literal("Horizontal"), base]),
    Type.TemplateLiteral([Type.Literal("Vertical"), base]),

    Type.TemplateLiteral([base, Type.Literal("OldDots")]),
    Type.TemplateLiteral([base, Type.Literal("DM")]),
    Type.TemplateLiteral([base, Type.Literal("HD")]),
    Type.TemplateLiteral([base, Type.Literal("HM")]),
    Type.TemplateLiteral([base, Type.Literal("DMOH")]),

    Type.TemplateLiteral([Type.Literal("RhythmGame"), base]),

    Type.TemplateLiteral([Type.Literal("ReBeat_"), base]),

    Type.TemplateLiteral([base, Type.Literal("-PinkPlay_Controllable")]),
    Type.TemplateLiteral([Type.Literal("Generated"), base, Type.Literal("-PinkPlay_Controllable")]),
    Type.TemplateLiteral([Type.Literal("Inverse"), base, Type.Literal("-PinkPlay_Controllable")]),
    Type.TemplateLiteral([Type.Literal("Inverted"), base, Type.Literal("-PinkPlay_Controllable")]),
    Type.TemplateLiteral([Type.Literal("Horizontal"), base, Type.Literal("-PinkPlay_Controllable")]),
    Type.TemplateLiteral([Type.Literal("Vertical"), base, Type.Literal("-PinkPlay_Controllable")]),
  ],
  { default: "Standard" }
);

export type MapCharacteristicBase = StaticDecode<typeof base>;
export type MapCharacteristic = StaticDecode<typeof mapCharacteristicShape>;

export const MapCharacteristicSchema = Type.Unsafe<MapCharacteristic>(Type.String({ default: "Standard" }));
