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

export const MapCharacteristicSchema = z
  .union([
    base,

    z.templateLiteral([z.literal("Generated"), base]),
    z.templateLiteral([z.literal("Inverse"), base]),
    z.templateLiteral([z.literal("Inverted"), base]),
    z.templateLiteral([z.literal("Horizontal"), base]),
    z.templateLiteral([z.literal("Vertical"), base]),

    z.templateLiteral([base, z.literal("OldDots")]),

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
export type MapCharacteristic = z.infer<typeof MapCharacteristicSchema>;
