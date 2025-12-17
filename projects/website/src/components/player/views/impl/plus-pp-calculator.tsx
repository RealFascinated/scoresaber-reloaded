"use client";

import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Spinner } from "../../../spinner";
import { Label } from "../../../ui/label";
import { Slider } from "../../../ui/slider";

export default function PlusPpCalculator({ player }: { player: ScoreSaberPlayer }) {
  const { data: scorePps, isLoading } = useQuery({
    queryKey: ["scorePps", player.id],
    queryFn: () => ssrApi.getPlayerPps(player.id),
  });

  const [accuracy, setAccuracy] = useState(95);
  const [stars, setStars] = useState(10);

  useEffect(() => {
    if (!scorePps) return;

    const scoresPpsArray = scorePps.scores.map(score => score.pp);
    if (scoresPpsArray.length === 0) return;

    const startTime = performance.now();

    // Calculate the target raw PP needed for exactly 1.00 weighted PP gain
    const targetRawPp = ScoreSaberCurve.calcRawPpForExpectedPp(scoresPpsArray, 1);

    // Use 10 stars and find the accuracy that gives this target raw PP
    const targetStars = 10;
    let lowAcc = 85;
    let highAcc = 100;
    let bestAccuracy = 95;
    let bestDiff = Infinity;

    // Binary search for accuracy
    for (let i = 0; i < 30; i++) {
      const midAcc = (lowAcc + highAcc) / 2;
      const rawPp = ScoreSaberCurve.getPp(targetStars, midAcc);

      // Check rounded version
      const roundedAcc = Math.round(midAcc * 20) / 20;
      const roundedRawPp = ScoreSaberCurve.getPp(targetStars, roundedAcc);
      const roundedWeightedGain = ScoreSaberCurve.getRawPpForWeightedPpGain(
        scoresPpsArray,
        roundedRawPp
      );
      const roundedDiff = Math.abs(roundedWeightedGain - 1.0);

      if (roundedDiff < Math.abs(bestDiff)) {
        bestDiff = roundedWeightedGain - 1.0;
        bestAccuracy = roundedAcc;
      }

      if (rawPp < targetRawPp) {
        lowAcc = midAcc;
      } else {
        highAcc = midAcc;
      }

      if (Math.abs(rawPp - targetRawPp) < 0.001) {
        break;
      }
    }

    const endTime = performance.now();
    console.log(`PP calculation time: ${(endTime - startTime).toFixed(2)}ms`);
    setAccuracy(bestAccuracy);
    setStars(targetStars);
  }, [scorePps]);

  const ppGain = useMemo(() => {
    const rawPp = ScoreSaberCurve.getPp(stars, accuracy);
    return {
      rawPp,
      weightedPpGain: ScoreSaberCurve.getRawPpForWeightedPpGain(
        scorePps?.scores.map(score => score.pp) ?? [],
        rawPp
      ),
    };
  }, [scorePps, stars, accuracy]);

  return (
    <div className="flex justify-center w-full">
      <div className="flex h-full w-full max-w-2xl flex-col gap-6">
        {isLoading ? (
          <Spinner />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="accuracy-slider" className="text-base font-semibold">
                    Accuracy
                  </Label>
                  <span className="text-muted-foreground text-sm font-medium">
                    {accuracy.toFixed(2)}%
                  </span>
                </div>
                <Slider
                  id="accuracy-slider"
                  value={[accuracy]}
                  onValueChange={value => setAccuracy(value[0])}
                  min={85}
                  max={100}
                  step={0.01}
                  labelPosition="none"
                  className="w-full"
                />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="stars-slider" className="text-base font-semibold">
                    Stars
                  </Label>
                  <span className="text-muted-foreground text-sm font-medium">
                    {stars.toFixed(1)}★
                  </span>
                </div>
                <Slider
                  id="stars-slider"
                  value={[stars]}
                  onValueChange={value => setStars(value[0])}
                  min={0}
                  max={SHARED_CONSTS.maxStars}
                  step={0.1}
                  labelPosition="none"
                  className="w-full"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="bg-muted/50 border-border flex flex-col gap-2 rounded-lg border p-4">
                <Label className="text-muted-foreground text-sm font-medium">Raw PP</Label>
                <p className="text-2xl font-bold">{formatPp(ppGain.rawPp)}pp</p>
              </div>
              <div className="bg-muted/50 border-border flex flex-col gap-2 rounded-lg border p-4">
                <Label className="text-muted-foreground text-sm font-medium">
                  Weighted PP Gain
                </Label>
                <p className="text-2xl font-bold">+{formatPp(ppGain.weightedPpGain)}pp</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
