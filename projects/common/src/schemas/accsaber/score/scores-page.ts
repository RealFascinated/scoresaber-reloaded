import { Type, type StaticDecode } from "@sinclair/typebox";
import { ScoreResponseSchema } from "./score";

/**
 * AccSaber REST API page wrapper (Spring `Page<ScoreResponse>`,
 * GET /v1/users/{userId}/scores). Pages are 0-indexed (`number`).
 */
export const ScorePageResponseSchema = Type.Object({
  content: Type.Array(ScoreResponseSchema),
  empty: Type.Boolean(),
  first: Type.Boolean(),
  last: Type.Boolean(),
  number: Type.Number(),
  numberOfElements: Type.Number(),
  size: Type.Number(),
  sort: Type.Object({
    empty: Type.Boolean(),
    sorted: Type.Boolean(),
    unsorted: Type.Boolean(),
  }),
  pageable: Type.Object({
    offset: Type.Number(),
    pageNumber: Type.Number(),
    pageSize: Type.Number(),
    paged: Type.Boolean(),
    sort: Type.Object({
      empty: Type.Boolean(),
      sorted: Type.Boolean(),
      unsorted: Type.Boolean(),
    }),
    unpaged: Type.Boolean(),
  }),
  totalElements: Type.Number(),
  totalPages: Type.Number(),
});

export type ScorePageResponse = StaticDecode<typeof ScorePageResponseSchema>;
