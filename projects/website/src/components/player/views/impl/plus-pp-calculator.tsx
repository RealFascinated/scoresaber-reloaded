"use client";

import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Spinner } from "../../../spinner";
import { Button } from "../../../ui/button";
import { Label } from "../../../ui/label";
import { Slider } from "../../../ui/slider";

const ACCURACY_THRESHOLDS = [92, 93, 94, 95, 96, 97, 98, 99] as const;
const DEFAULT_DESIRED_PP = 1;
const DEFAULT_ACCURACY = 95;
const DEFAULT_STARS = 10;

function RawPpDisplay({
  desiredPpGain,
  targetRawPp,
  onReset,
}: {
  desiredPpGain: number;
  targetRawPp: number | null;
  onReset: () => void;
}) {
  return (
    <div className="bg-muted/50 border-border flex flex-col gap-2 rounded-lg border px-4 pb-4 pt-3 md:px-5 md:pb-5 md:pt-4">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-muted-foreground text-xs font-medium sm:text-sm">
          Raw PP needed for +{formatPp(desiredPpGain)}pp
        </Label>
        <Button variant="outline" size="sm" onClick={onReset} className="touch-manipulation">
          Reset
        </Button>
      </div>
      <p className="text-xl font-bold sm:text-2xl">
        {targetRawPp ? `${formatPp(targetRawPp)}pp` : "Unknown"}
      </p>
    </div>
  );
}

function AccuracyThresholdTable({
  targetRawPp,
  getStarsForAcc,
}: {
  targetRawPp: number;
  getStarsForAcc: (rawPp: number, acc: number) => number;
}) {
  return (
    <div className="bg-muted/30 border-border overflow-hidden rounded-lg border">
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-border bg-muted/30 border-b">
              {ACCURACY_THRESHOLDS.map(threshold => (
                <th
                  key={threshold}
                  className="px-2 py-2 text-center text-xs font-medium sm:px-4 sm:py-3 sm:text-sm"
                >
                  {threshold}%
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {ACCURACY_THRESHOLDS.map(threshold => {
                const starsForAcc = getStarsForAcc(targetRawPp, threshold);
                return (
                  <td
                    key={threshold}
                    className="px-2 py-2 text-center font-mono text-xs sm:px-4 sm:py-3 sm:text-sm"
                  >
                    {starsForAcc > SHARED_CONSTS.maxStars ? "—" : `${starsForAcc.toFixed(2)}★`}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PlusPpCalculator({ player }: { player: ScoreSaberPlayer }) {
  const { data: scorePps, isLoading } = useQuery({
    queryKey: ["scorePps", player.id],
    queryFn: () => ssrApi.getPlayerPps(player.id),
  });

  const [accuracy, setAccuracy] = useState(DEFAULT_ACCURACY);
  const [stars, setStars] = useState(DEFAULT_STARS);

  const scoresPpsArray = useMemo(() => {
    return scorePps?.scores.map(score => score.pp) ?? [];
  }, [scorePps]);

  const desiredPpGain = useMemo(() => {
    if (scoresPpsArray.length === 0) return 0;
    const rawPp = ScoreSaberCurve.getPp(stars, accuracy);
    const weightedGain = ScoreSaberCurve.getRawPpForWeightedPpGain(scoresPpsArray, rawPp);
    return Math.max(0, Math.round(weightedGain * 10) / 10);
  }, [scoresPpsArray, stars, accuracy]);

  const targetRawPp = useMemo(() => {
    if (scoresPpsArray.length === 0) return null;
    return ScoreSaberCurve.calcRawPpForExpectedPp(scoresPpsArray, desiredPpGain);
  }, [scoresPpsArray, desiredPpGain]);

  const getStarsForAcc = (rawPp: number, acc: number): number => {
    return rawPp / (ScoreSaberCurve.STAR_MULTIPLIER * ScoreSaberCurve.getModifier(acc));
  };

  const handleAccuracyChange = (value: number) => {
    setAccuracy(value);
  };

  const handleStarsChange = (value: number) => {
    setStars(value);
  };

  const handleReset = () => {
    setAccuracy(DEFAULT_ACCURACY);

    if (scoresPpsArray.length === 0) {
      setStars(DEFAULT_STARS);
      return;
    }

    const rawPpForDefaultGain = ScoreSaberCurve.calcRawPpForExpectedPp(scoresPpsArray, DEFAULT_DESIRED_PP);
    const resetStars = getStarsForAcc(rawPpForDefaultGain, DEFAULT_ACCURACY);
    const clampedStars = Math.min(Math.max(0, resetStars), SHARED_CONSTS.maxStars);
    setStars(Math.round(clampedStars * 10) / 10);
  };

  return (
    <div className="flex w-full flex-col gap-4 md:gap-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <>
          {/* Accuracy and Stars Sliders */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <div className="flex flex-col gap-3 md:gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="accuracy-slider" className="text-sm font-semibold sm:text-base">
                  Accuracy
                </Label>
                <span className="text-muted-foreground text-sm font-medium">{accuracy.toFixed(2)}%</span>
              </div>
              <Slider
                id="accuracy-slider"
                value={[accuracy]}
                onValueChange={value => handleAccuracyChange(value[0])}
                min={85}
                max={100}
                step={0.01}
                labelPosition="none"
                className="w-full touch-manipulation"
              />
            </div>
            <div className="flex flex-col gap-3 md:gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="stars-slider" className="text-sm font-semibold sm:text-base">
                  Stars
                </Label>
                <span className="text-muted-foreground text-sm font-medium">{stars.toFixed(1)} ★</span>
              </div>
              <Slider
                id="stars-slider"
                value={[stars]}
                onValueChange={value => handleStarsChange(value[0])}
                min={0}
                max={SHARED_CONSTS.maxStars}
                step={0.1}
                labelPosition="none"
                className="w-full touch-manipulation"
              />
            </div>
          </div>

          <RawPpDisplay desiredPpGain={desiredPpGain} targetRawPp={targetRawPp} onReset={handleReset} />

          {targetRawPp ? (
            <AccuracyThresholdTable targetRawPp={targetRawPp} getStarsForAcc={getStarsForAcc} />
          ) : null}
        </>
      )}
    </div>
  );
}
