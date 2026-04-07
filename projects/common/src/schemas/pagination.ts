import { z } from "zod";

export const PaginationMetadataSchema = z.object({
  totalPages: z.number(),
  totalItems: z.number(),
  page: z.number(),
  itemsPerPage: z.number(),
});

export type PaginationMetadata = z.infer<typeof PaginationMetadataSchema>;
