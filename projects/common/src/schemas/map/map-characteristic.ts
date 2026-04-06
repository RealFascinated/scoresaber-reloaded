import { z } from "zod";

export const base = z.enum([
  "Standard",
  "OneSaber",
  "NoArrows",
  "Lawless",
  "90Degree",
  "360Degree",
  "Lightshow",
  "Legacy",
  "MissingCharacteristic",
]);

const mapCharacteristicShape = z
  .union([
    base,

    z.templateLiteral([z.literal("Generated"), base]),
    z.templateLiteral([z.literal("Inverse"), base]),
    z.templateLiteral([z.literal("Inverted"), base]),
    z.templateLiteral([z.literal("Horizontal"), base]),
    z.templateLiteral([z.literal("Vertical"), base]),

    z.templateLiteral([base, z.literal("OldDots")]),
    z.templateLiteral([base, z.literal("DM")]),
    z.templateLiteral([base, z.literal("HD")]),
    z.templateLiteral([base, z.literal("HM")]),
    z.templateLiteral([base, z.literal("DMOH")]),

    z.templateLiteral([z.literal("RhythmGame"), base]),

    z.templateLiteral([z.literal("ReBeat_"), base]),

    z.templateLiteral([base, z.literal("-PinkPlay_Controllable")]),
    z.templateLiteral([z.literal("Generated"), base, z.literal("-PinkPlay_Controllable")]),
    z.templateLiteral([z.literal("Inverse"), base, z.literal("-PinkPlay_Controllable")]),
    z.templateLiteral([z.literal("Inverted"), base, z.literal("-PinkPlay_Controllable")]),
    z.templateLiteral([z.literal("Horizontal"), base, z.literal("-PinkPlay_Controllable")]),
    z.templateLiteral([z.literal("Vertical"), base, z.literal("-PinkPlay_Controllable")]),
  ])
  .default("Standard");

export type MapCharacteristicBase = z.infer<typeof base>;
export type MapCharacteristic = z.infer<typeof mapCharacteristicShape>;

export const MapCharacteristicSchema = z
  .string()
  .default("Standard")
  .transform((s): MapCharacteristic => s as MapCharacteristic);
