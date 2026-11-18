import { describe, expect, test } from "bun:test";
import { HttpResponse, delay } from "msw";
import { server } from "../../../test/helpers/msw-server";
import { scoreSaberApi } from "../../../test/helpers/scoresaber-api.test-utils";
import { buildScoreSaberV2PlayerToken } from "../../../test/helpers/scoresaber.fixture";
import { SCORESABER_API_CALL_METRIC_NAME } from "../../metrics/impl/backend/scoresaber-api-call";
import { prometheusRegistry } from "../../metrics/prometheus";
import { ScoreSaberApiService } from "./scoresaber-api.service";

async function callCount(endpoint: string, outcome: string) {
  const text = await prometheusRegistry.getSingleMetricAsString(SCORESABER_API_CALL_METRIC_NAME);
  const line = text
    .split("\n")
    .find(
      entry =>
        entry.startsWith(`${SCORESABER_API_CALL_METRIC_NAME}_count{`) &&
        entry.includes(`endpoint="${endpoint}"`) &&
        entry.includes(`outcome="${outcome}"`)
    );
  return line === undefined ? 0 : Number(line.slice(line.lastIndexOf(" ") + 1));
}

describe("ScoreSaberApiService requests", () => {
  test("a slow first response is hedged and the call resolves with the fast duplicate", async () => {
    const playerId = "76561198000000101";
    let requests = 0;
    server.use(
      scoreSaberApi("/v2/players/:id", async () => {
        requests++;
        if (requests === 1) {
          await delay(3000);
        }
        return HttpResponse.json(buildScoreSaberV2PlayerToken({ id: playerId }));
      })
    );

    const startedAt = performance.now();
    const player = await ScoreSaberApiService.lookupPlayer(playerId, undefined, { fresh: true });
    const elapsedMs = performance.now() - startedAt;

    expect(player?.id).toBe(playerId);
    expect(requests).toBe(2);
    expect(elapsedMs).toBeGreaterThanOrEqual(700);
    expect(elapsedMs).toBeLessThan(2000);
  });

  test("a fast response is not hedged", async () => {
    const playerId = "76561198000000102";
    let requests = 0;
    server.use(
      scoreSaberApi("/v2/players/:id", () => {
        requests++;
        return HttpResponse.json(buildScoreSaberV2PlayerToken({ id: playerId }));
      })
    );

    const startedAt = performance.now();
    const player = await ScoreSaberApiService.lookupPlayer(playerId, undefined, { fresh: true });

    expect(player?.id).toBe(playerId);
    expect(requests).toBe(1);
    expect(performance.now() - startedAt).toBeLessThan(700);
  });

  test("a 404 is neither retried nor hedged", async () => {
    const playerId = "76561198000000103";
    let requests = 0;
    server.use(
      scoreSaberApi("/v2/players/:id", () => {
        requests++;
        return new HttpResponse(null, { status: 404 });
      })
    );

    const startedAt = performance.now();
    const player = await ScoreSaberApiService.lookupPlayer(playerId, undefined, { fresh: true });

    expect(player).toBeUndefined();
    expect(requests).toBe(1);
    expect(performance.now() - startedAt).toBeLessThan(2000);
  });

  test("retrying stops when the next backoff would exceed the total deadline", async () => {
    const playerId = "76561198000000104";
    let requests = 0;
    server.use(
      scoreSaberApi("/v2/players/:id", () => {
        requests++;
        return new HttpResponse(null, { status: 429, headers: { "retry-after": "20" } });
      })
    );

    const startedAt = performance.now();
    const player = await ScoreSaberApiService.lookupPlayer(playerId, undefined, { fresh: true });

    expect(player).toBeUndefined();
    expect(requests).toBe(1);
    expect(performance.now() - startedAt).toBeLessThan(2000);
  });

  test("a server error is retried until it recovers", async () => {
    const playerId = "76561198000000105";
    let requests = 0;
    server.use(
      scoreSaberApi("/v2/players/:id", () => {
        requests++;
        if (requests === 1) {
          return new HttpResponse(null, { status: 503 });
        }
        return HttpResponse.json(buildScoreSaberV2PlayerToken({ id: playerId }));
      })
    );

    const player = await ScoreSaberApiService.lookupPlayer(playerId, undefined, { fresh: true });

    expect(player?.id).toBe(playerId);
    expect(requests).toBe(2);
  });

  test("the call histogram records each outcome under a bounded endpoint label", async () => {
    const okBefore = await callCount("v2/players/:id", "ok");
    const notFoundBefore = await callCount("v2/players/:id", "http_4xx");
    const failedBefore = await callCount("v2/players/:id", "http_5xx");

    server.use(
      scoreSaberApi("/v2/players/:id", ({ params }) => {
        if (params.id === "76561198000000106") {
          return HttpResponse.json(buildScoreSaberV2PlayerToken({ id: params.id }));
        }
        if (params.id === "76561198000000107") {
          return new HttpResponse(null, { status: 404 });
        }
        return new HttpResponse(null, { status: 500, headers: { "retry-after": "20" } });
      })
    );

    await ScoreSaberApiService.lookupPlayer("76561198000000106", undefined, { fresh: true });
    await ScoreSaberApiService.lookupPlayer("76561198000000107", undefined, { fresh: true });
    await ScoreSaberApiService.lookupPlayer("not-a-real-player-id", undefined, { fresh: true });

    expect(await callCount("v2/players/:id", "ok")).toBe(okBefore + 1);
    expect(await callCount("v2/players/:id", "http_4xx")).toBe(notFoundBefore + 1);
    expect(await callCount("v2/players/:id", "http_5xx")).toBe(failedBefore + 1);
    expect(await callCount("other", "http_5xx")).toBe(0);
  });
});
