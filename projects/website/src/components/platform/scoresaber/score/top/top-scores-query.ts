import type { TimestampedData } from "@/common/server-prefetch";
import type { TopScoresPageResponse } from "@ssr/common/schemas/response/score/top-scores";
import { createLoader, parseAsInteger } from "nuqs/server";

/**
 * The URL params of the top scores page. Shared by the client and the server so both read the URL the same way.
 */
export const topScoresSearchParams = {
  page: parseAsInteger.withDefault(1),
};

export const loadTopScoresSearchParams = createLoader(topScoresSearchParams);

/** Top scores fetched on the server, along with the page they were fetched for. */
export type TopScoresInitialData = TimestampedData<TopScoresPageResponse> & {
  page: number;
};
