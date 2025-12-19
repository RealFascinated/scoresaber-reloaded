import { z } from "zod";

export const MapCharacteristicSchema = z
  .enum(["Standard", "OneSaber", "NoArrows", "Lawless", "90Degree", "360Degree", "Lightshow"])
  .default("Standard");
export type MapCharacteristic = z.infer<typeof MapCharacteristicSchema>;
