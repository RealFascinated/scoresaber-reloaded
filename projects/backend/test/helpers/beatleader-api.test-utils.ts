import { env } from "@ssr/common/env";
import { HttpResponse, http, type JsonBodyType } from "msw";

export const BEATLEADER_API_HOST = "api.beatleader.com";
export const BEATLEADER_SCORE_STATS_CDN = "https://cdn.scorestats.beatleader.com";

/**
 * Answers a BeatLeader API GET the way the real API would. The backend reaches BeatLeader through
 * its proxy, so the real request URL is unwrapped from the proxy path before it is matched.
 *
 * @param resolver builds the response from the real request URL, or returns undefined to let the next handler answer
 */
export function beatLeaderApi(
  resolver: (target: URL) => Response | undefined | Promise<Response | undefined>
) {
  return http.get(`${env.PROXY_URL}/*`, ({ request }) => {
    const target = new URL(decodeURIComponent(new URL(request.url).pathname.slice(1)));
    if (target.host !== BEATLEADER_API_HOST) {
      return undefined;
    }
    return resolver(target);
  });
}

/** Serves the stats BeatLeader published for a score. */
export function beatLeaderScoreStats(scoreId: number, stats: JsonBodyType) {
  return http.get(`${BEATLEADER_SCORE_STATS_CDN}/${scoreId}.json`, () => HttpResponse.json(stats));
}

export const beatLeaderApiHandlers = [
  beatLeaderApi(() => new HttpResponse(null, { status: 404 })),
  http.get(`${BEATLEADER_SCORE_STATS_CDN}/:file`, () => new HttpResponse(null, { status: 404 })),
];
