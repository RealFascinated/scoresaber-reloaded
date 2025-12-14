import { z } from "zod";

export const MapCharacteristicSchema = z.union([z.literal("Standard"), z.literal("Lawless")]).default("Standard");
export type MapCharacteristic = z.infer<typeof MapCharacteristicSchema>;
