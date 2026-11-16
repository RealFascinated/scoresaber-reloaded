/**
 * Runs the production data path (cursor load -> fit -> rank) against DATABASE_URL without writing anything.
 *
 *   DATABASE_URL=... bun scripts/suggested-maps-sim/dry-run.ts <playerId>
 */
import {
  DEFAULT_SUGGESTED_MAPS_PARAMS,
  estimatePlayerSkill,
  fitSuggestedMapsModel,
  scoreWeight,
} from "@ssr/common/suggested-maps/suggested-maps-model";
import {
  listPlayerScores,
  listRankedMaps,
  loadFitData,
} from "../../src/service/suggested-maps/suggested-maps-data";
import {
  derivePlayerStyle,
  rankSuggestedMaps,
  type RankableMap,
} from "../../src/service/suggested-maps/suggested-maps-ranking";

const playerId = process.argv[2];
const params = DEFAULT_SUGGESTED_MAPS_PARAMS;

let t = performance.now();
const lap = (label: string): void => {
  console.log(`${label}: ${((performance.now() - t) / 1000).toFixed(1)}s`);
  t = performance.now();
};

const maps = await listRankedMaps();
lap(`listRankedMaps (${maps.length})`);
const data = await loadFitData(maps, params);
lap(`loadFitData (${data.y.length} scores, ${data.playerCount} players)`);
const model = fitSuggestedMapsModel(data, params);
lap("fit");

const rankable: RankableMap[] = maps.map((m, i) => ({
  ...m,
  ease: model.ease[i],
  prior: model.prior[i],
  scoreCount: model.mapScores[i],
}));

const scores = await listPlayerScores(playerId);
const byId = new Map(rankable.map(m => [m.leaderboardId, m]));
const fit = estimatePlayerSkill(
  scores.flatMap(s => {
    const m = byId.get(s.leaderboardId);
    return m ? [{ ease: m.ease, stars: m.stars, accuracy: s.accuracy, weight: scoreWeight(s, params) }] : [];
  }),
  params,
  model.weightScale
);
lap(
  `player ${playerId}: ${scores.length} scores, skill ${fit.skill.toFixed(3)} slope ${fit.slope.toFixed(3)}`
);

const style = derivePlayerStyle(
  scores.flatMap(s => {
    const m = byId.get(s.leaderboardId);
    return m
      ? [{ stars: m.stars, seconds: m.seconds, nps: m.nps, ageDays: s.ageDays, accuracy: s.accuracy }]
      : [];
  })
);
console.log("fitted ranges", JSON.stringify(style.ranges));

const ranked = rankSuggestedMaps({
  maps: rankable,
  skill: fit.skill,
  slope: fit.slope,
  params,
  filters: {
    minStars: 0,
    maxStars: 20,
    minSeconds: 0,
    maxSeconds: Number.POSITIVE_INFINITY,
    maxNps: Number.POSITIVE_INFINITY,
    ...style.ranges,
    minScores: 30,
    hidePlayed: false,
    sort: "gain",
    limit: 15,
  },
  playerScores: new Map(scores.map(s => [s.leaderboardId, { pp: s.pp, accuracy: s.accuracy }])),
  playerPps: scores.map(s => s.pp),
  style,
});
lap("rank");
for (const m of ranked) {
  console.log(
    `+${(m.weightedGain ?? 0).toFixed(1).padStart(5)}wpp  pred ${m.predictedAccuracy.toFixed(2)}% = ${m.predictedPp.toFixed(0)}pp (now ${m.currentPp?.toFixed(0) ?? "-"} @ ${m.currentAccuracy?.toFixed(2) ?? "-"}) needs ${m.requiredAccuracy?.toFixed(2) ?? "-"}%  over ${m.bonusPp.toFixed(0)}pp  ${m.stars.toFixed(2)}★ ${Math.round(m.seconds)}s nps ${m.nps.toFixed(1)}  score ${m.score.toFixed(1)} fam ${m.familiarity.toFixed(2)}  ${m.songName} [${m.difficulty}]`
  );
}
process.exit(0);
