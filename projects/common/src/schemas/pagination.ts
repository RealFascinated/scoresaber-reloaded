import { Type, type StaticDecode } from "@sinclair/typebox";

export const PaginationMetadataSchema = Type.Object({
  totalPages: Type.Number(),
  totalItems: Type.Number(),
  page: Type.Number(),
  itemsPerPage: Type.Number(),
});

export type PaginationMetadata = StaticDecode<typeof PaginationMetadataSchema>;
