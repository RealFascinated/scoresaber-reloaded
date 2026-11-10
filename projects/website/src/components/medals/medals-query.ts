import type { TimestampedData } from "@/common/server-prefetch";
import type { PlayerMedalRankingsResponse } from "@ssr/common/schemas/response/ranking/medal-rankings";
import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";

/**
 * The URL params of the medals page. Shared by the client and the server so both read the URL the same way.
 */
export const medalsSearchParams = {
  page: parseAsInteger.withDefault(1),
  country: parseAsString,
};

export const loadMedalsSearchParams = createLoader(medalsSearchParams);

/** The parameters that decide which players the medals page requests. */
export type MedalsQuery = {
  page: number;
  country: string | undefined;
};

/** Medal rankings fetched on the server, along with the query they were fetched for. */
export type MedalsInitialData = TimestampedData<PlayerMedalRankingsResponse> & {
  query: MedalsQuery;
};

/**
 * Builds the query for the medals page from its URL params.
 *
 * @param page the page number
 * @param country the country filter
 */
export function buildMedalsQuery(page: number, country: string | null): MedalsQuery {
  return { page, country: country?.toUpperCase() ?? undefined };
}

export function isSameMedalsQuery(a: MedalsQuery, b: MedalsQuery): boolean {
  return a.page === b.page && a.country === b.country;
}
