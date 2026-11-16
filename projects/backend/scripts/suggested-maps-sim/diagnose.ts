/**
 * Compares predicted and actual accuracy of a player's own scores per star band (read-only).
 *
 *   DATABASE_URL=... bun scripts/suggested-maps-sim/diagnose.ts <playerId> [playerId...]
 */
import {
  DEFAULT_SUGGESTED_MAPS_PARAMS,
  estimatePlayerSkill,
  fitSuggestedMapsModel,
  predictAccuracy,
  scoreWeight,
} from "@ssr/common/suggested-maps/suggested-maps-model";
import {
  listPlayerScores,
  listRankedMaps,
  loadFitData,
} from "../../src/service/suggested-maps/suggested-maps-data";

const params = DEFAULT_SUGGESTED_MAPS_PARAMS;
const maps = await listRankedMaps();
const data = await loadFitData(maps, params);
const model = fitSuggestedMapsModel(data, params);
const byId = new Map(
  maps.map((m, i) => [m.leaderboardId, { stars: m.stars, ease: model.ease[i], count: model.mapScores[i] }])
);

for (const playerId of process.argv.slice(2)) {
  const scores = await listPlayerScores(playerId);
  const points = scores.flatMap(s => {
    const m = byId.get(s.leaderboardId);
    return m
      ? [
          {
            ease: m.ease,
            stars: m.stars,
            accuracy: s.accuracy,
            weight: scoreWeight(s, params),
            pp: s.pp,
            count: m.count,
          },
        ]
      : [];
  });
  const frontier = estimatePlayerSkill(points, params, model.weightScale);
  const plain = estimatePlayerSkill(points, { ...params, skillQuantile: 1 }, model.weightScale);
  console.log(
    `\nplayer ${playerId}: ${points.length} scores, frontier skill ${frontier.skill.toFixed(2)} slope ${frontier.slope.toFixed(3)}, plain skill ${plain.skill.toFixed(2)} slope ${plain.slope.toFixed(3)}`
  );
  console.log("stars   n   actual%  frontier%  plain%   bestActual%  avgMapScores");
  for (let lo = 0; lo < 16; lo += 2) {
    const band = points.filter(p => p.stars >= lo && p.stars < lo + 2 && p.accuracy >= 80);
    if (band.length < 3) {
      continue;
    }
    const avg = (f: (p: (typeof band)[number]) => number): number =>
      band.reduce((s, p) => s + f(p), 0) / band.length;
    console.log(
      `${lo}-${lo + 2}`.padEnd(6),
      String(band.length).padStart(4),
      avg(p => p.accuracy)
        .toFixed(2)
        .padStart(8),
      avg(p => predictAccuracy(frontier.skill, frontier.slope, p.stars, p.ease))
        .toFixed(2)
        .padStart(9),
      avg(p => predictAccuracy(plain.skill, plain.slope, p.stars, p.ease))
        .toFixed(2)
        .padStart(8),
      Math.max(...band.map(p => p.accuracy))
        .toFixed(2)
        .padStart(10),
      Math.round(avg(p => p.count))
        .toString()
        .padStart(10)
    );
  }
}
process.exit(0);
