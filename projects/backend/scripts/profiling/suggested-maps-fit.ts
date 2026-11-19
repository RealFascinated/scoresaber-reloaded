import "./env";
import {
  DEFAULT_SUGGESTED_MAPS_PARAMS,
  fitSuggestedMapsModel,
} from "@ssr/common/suggested-maps/suggested-maps-model";
import { listRankedMaps, loadFitData } from "../../src/service/suggested-maps/suggested-maps-data";

const params = DEFAULT_SUGGESTED_MAPS_PARAMS;
const data = await loadFitData(await listRankedMaps(), params);
const runs = Number(process.env.RUNS ?? 3);
const times: number[] = [];
const coldStart = performance.now();
let model = fitSuggestedMapsModel(data, params);
console.log(`[fit] cold=${(performance.now() - coldStart).toFixed(0)}ms`);
for (let run = 0; run < runs; run++) {
  const before = performance.now();
  model = fitSuggestedMapsModel(data, params);
  times.push(performance.now() - before);
}
console.log(`[fit] rows=${data.y.length} runs=${times.map(time => time.toFixed(0)).join(",")}ms`);

const output = process.env.FIT_OUTPUT;
if (output) {
  await Bun.write(
    output,
    JSON.stringify({
      ease: [...model.ease],
      prior: [...model.prior],
      mapScores: [...model.mapScores],
      weightScale: model.weightScale,
    })
  );
}
const reference = process.env.FIT_REFERENCE;
if (reference) {
  const expected: { ease: number[]; prior: number[]; mapScores: number[]; weightScale: number } =
    await Bun.file(reference).json();
  let maxEase = 0;
  let maxPrior = 0;
  model.ease.forEach((value, i) => {
    maxEase = Math.max(maxEase, Math.abs(value - expected.ease[i]));
  });
  model.prior.forEach((value, i) => {
    maxPrior = Math.max(maxPrior, Math.abs(value - expected.prior[i]));
  });
  const scoresMatch = model.mapScores.every((value, i) => value === expected.mapScores[i]);
  console.log(
    `[fit] vs reference: max |ease diff|=${maxEase.toExponential(2)} max |prior diff|=${maxPrior.toExponential(2)} mapScores ${scoresMatch ? "equal" : "DIFFER"} weightScale diff=${Math.abs(model.weightScale - expected.weightScale).toExponential(2)}`
  );
}
process.exit(0);
