import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import {
  DEFAULT_SUGGESTED_MAPS_PARAMS,
  fitSuggestedMapsModel,
} from "@ssr/common/suggested-maps/suggested-maps-model";
import { db } from "../../db";
import { ScoreSaberLeaderboardSuggestedMapsRepository } from "../../repositories/scoresaber-leaderboard-suggested-maps.repository";
import { listRankedMaps, loadFitData } from "./suggested-maps-data";

declare const self: Worker;

/** What a refit worker posts back once the fitted eases are stored. */
export type SuggestedMapsFitResult = {
  scoreCount: number;
  playerCount: number;
  mapCount: number;
  loadMs: number;
  fitMs: number;
};

const params = DEFAULT_SUGGESTED_MAPS_PARAMS;
const before = performance.now();
const maps = await listRankedMaps();
const data = await loadFitData(maps, params);
const loadedAt = performance.now();
const model = fitSuggestedMapsModel(data, params);
const fittedAt = performance.now();
const updatedAt = new Date();

await ScoreSaberLeaderboardSuggestedMapsRepository.replaceRealm(
  DEFAULT_REALM_ID,
  maps.map((map, i) => ({
    leaderboardId: map.leaderboardId,
    realmId: DEFAULT_REALM_ID,
    ease: model.ease[i],
    prior: model.prior[i],
    scoreCount: model.mapScores[i],
    weightScale: model.weightScale,
    updatedAt,
  }))
);
await db.$client.end();

self.postMessage({
  scoreCount: data.y.length,
  playerCount: data.playerCount,
  mapCount: maps.length,
  loadMs: loadedAt - before,
  fitMs: fittedAt - loadedAt,
} satisfies SuggestedMapsFitResult);
