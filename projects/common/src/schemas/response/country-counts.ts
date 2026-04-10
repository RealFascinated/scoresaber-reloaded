import { z } from "zod";

export const CountryCountsSchema = z.record(z.string(), z.number());

export type CountryCounts = z.infer<typeof CountryCountsSchema>;
