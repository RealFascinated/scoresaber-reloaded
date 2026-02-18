"use client";

import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "../../../spinner";
import { Button } from "../../../ui/button";
import { Label } from "../../../ui/label";
import { Slider } from "../../../ui/slider";

const ACCURACY_THRESHOLDS = [92, 93, 94, 95, 96, 97, 98, 99] as const;
const MIN_DESIRED_PP = 0.5;
const MAX_DESIRED_PP = 100;
const DEFAULT_DESIRED_PP = 1;
const DEFAULT_ACCURACY = 95;
const DEFAULT_STARS = 10;
const MIN_STARS = 0.1;
const MIN_ACCURACY = 75;

function RawPpDisplay({ desiredPpGain, targetRawPp }: { desiredPpGain: number; targetRawPp: number | null }) {
  return (
    <div className="bg-muted/50 border-border flex flex-col gap-2 rounded-lg border p-4 md:p-5">
      <Label className="text-muted-foreground text-xs font-medium sm:text-sm">
        Raw PP needed for +{formatPp(desiredPpGain)}pp
      </Label>
      <p className="text-xl font-bold sm:text-2xl">
        {targetRawPp ? `${formatPp(targetRawPp)}pp` : "Calculating..."}
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

  const [desiredPpGain, setDesiredPpGain] = useState(DEFAULT_DESIRED_PP);
  const [accuracy, setAccuracy] = useState(DEFAULT_ACCURACY);
  const [stars, setStars] = useState(DEFAULT_STARS);
  const isManualAdjustment = useRef(false);
  const hasManualStarsAcc = useRef(false);
  const accuracyRef = useRef(DEFAULT_ACCURACY);

  const scoresPpsArray = useMemo(() => {
    return scorePps?.scores.map(score => score.pp) ?? [];
  }, [scorePps]);

  const targetRawPp = useMemo(() => {
    if (scoresPpsArray.length === 0) return null;
    return ScoreSaberCurve.calcRawPpForExpectedPp(scoresPpsArray, desiredPpGain);
  }, [scoresPpsArray, desiredPpGain]);

  const getStarsForAcc = (rawPp: number, acc: number): number => {
    return rawPp / (ScoreSaberCurve.STAR_MULTIPLIER * ScoreSaberCurve.getModifier(acc));
  };

  const getAccForStars = (rawPp: number, stars: number): number => {
    const modifierNeeded = rawPp / (stars * ScoreSaberCurve.STAR_MULTIPLIER);
    let low = MIN_ACCURACY;
    let high = 100;
    for (let i = 0; i < 50; i++) {
      const mid = (low + high) / 2;
      const modifier = ScoreSaberCurve.getModifier(mid);
      if (modifier >= modifierNeeded) {
        high = mid;
      } else {
        low = mid;
      }
      if (Math.abs(modifier - modifierNeeded) < 0.0001) break;
    }
    return Math.round(high * 100) / 100;
  };

  const updateAccuracy = (newAcc: number) => {
    accuracyRef.current = newAcc;
    setAccuracy(newAcc);
  };

  const roundStars = (value: number): number => Math.round(value * 10) / 10;

  useEffect(() => {
    accuracyRef.current = accuracy;
  }, [accuracy]);

  useEffect(() => {
    if (!targetRawPp || isManualAdjustment.current || hasManualStarsAcc.current) return;

    let newStars = getStarsForAcc(targetRawPp, accuracyRef.current);

    if (newStars < 0.5) {
      newStars = 0.5;
      updateAccuracy(getAccForStars(targetRawPp, newStars));
      setStars(newStars);
    } else if (newStars > SHARED_CONSTS.maxStars) {
      newStars = SHARED_CONSTS.maxStars;
      updateAccuracy(getAccForStars(targetRawPp, newStars));
      setStars(newStars);
    } else {
      setStars(roundStars(newStars));
    }
  }, [targetRawPp]);

  const adjustForBounds = (
    weightedGain: number,
    adjustStars: boolean,
    currentStars: number,
    currentAcc: number
  ): { newStars: number; newAcc: number; newDesiredPp: number } => {
    if (weightedGain < MIN_DESIRED_PP) {
      const targetRawPp = ScoreSaberCurve.calcRawPpForExpectedPp(scoresPpsArray, MIN_DESIRED_PP);

      if (adjustStars) {
        let newStars = getStarsForAcc(targetRawPp, currentAcc);
        let newAcc = currentAcc;

        if (newStars > SHARED_CONSTS.maxStars) {
          newStars = SHARED_CONSTS.maxStars;
          newAcc = getAccForStars(targetRawPp, newStars);
        }

        return { newStars: roundStars(newStars), newAcc, newDesiredPp: MIN_DESIRED_PP };
      } else {
        let newAcc = getAccForStars(targetRawPp, currentStars);
        let newStars = currentStars;

        if (newAcc > 100) {
          newAcc = 100;
          newStars = getStarsForAcc(targetRawPp, 100);
          if (newStars > SHARED_CONSTS.maxStars) {
            newStars = SHARED_CONSTS.maxStars;
          }
        }

        return { newStars: roundStars(newStars), newAcc, newDesiredPp: MIN_DESIRED_PP };
      }
    } else if (weightedGain > MAX_DESIRED_PP) {
      const targetRawPp = ScoreSaberCurve.calcRawPpForExpectedPp(scoresPpsArray, MAX_DESIRED_PP);

      if (adjustStars) {
        let newStars = getStarsForAcc(targetRawPp, currentAcc);
        let newAcc = currentAcc;

        if (newStars < MIN_STARS) {
          newStars = MIN_STARS;
          newAcc = getAccForStars(targetRawPp, newStars);
        }

        return { newStars: roundStars(newStars), newAcc, newDesiredPp: MAX_DESIRED_PP };
      } else {
        let newAcc = getAccForStars(targetRawPp, currentStars);
        let newStars = currentStars;

        if (newAcc < MIN_ACCURACY) {
          newAcc = MIN_ACCURACY;
          newStars = getStarsForAcc(targetRawPp, MIN_ACCURACY);
          if (newStars < MIN_STARS) {
            newStars = MIN_STARS;
          }
        }

        return { newStars: roundStars(newStars), newAcc, newDesiredPp: MAX_DESIRED_PP };
      }
    }

    return {
      newStars: currentStars,
      newAcc: currentAcc,
      newDesiredPp: Math.round(weightedGain * 10) / 10,
    };
  };

  const handleDesiredPpChange = (value: number) => {
    hasManualStarsAcc.current = false;
    setDesiredPpGain(value);
  };

  const handleReset = () => {
    hasManualStarsAcc.current = false;
    setDesiredPpGain(DEFAULT_DESIRED_PP);
    updateAccuracy(DEFAULT_ACCURACY);

    // Explicitly recalculate stars based on reset values
    if (scoresPpsArray.length > 0) {
      const targetRawPp = ScoreSaberCurve.calcRawPpForExpectedPp(scoresPpsArray, DEFAULT_DESIRED_PP);
      let newStars = getStarsForAcc(targetRawPp, DEFAULT_ACCURACY);

      if (newStars < 0.5) {
        newStars = 0.5;
        const newAcc = getAccForStars(targetRawPp, newStars);
        updateAccuracy(newAcc);
      } else if (newStars > SHARED_CONSTS.maxStars) {
        newStars = SHARED_CONSTS.maxStars;
        const newAcc = getAccForStars(targetRawPp, newStars);
        updateAccuracy(newAcc);
      }

      setStars(roundStars(newStars));
    }
  };

  const handleAccuracyChange = (value: number) => {
    if (scoresPpsArray.length === 0) return;

    isManualAdjustment.current = true;
    hasManualStarsAcc.current = true;
    updateAccuracy(value);

    const rawPp = ScoreSaberCurve.getPp(stars, value);
    const weightedGain = ScoreSaberCurve.getRawPpForWeightedPpGain(scoresPpsArray, rawPp);
    const { newStars, newAcc, newDesiredPp } = adjustForBounds(weightedGain, true, stars, value);

    if (newAcc !== value) updateAccuracy(newAcc);
    if (newStars !== stars) setStars(newStars);
    setDesiredPpGain(newDesiredPp);

    setTimeout(() => {
      isManualAdjustment.current = false;
    }, 0);
  };

  const handleStarsChange = (value: number) => {
    if (scoresPpsArray.length === 0) return;

    isManualAdjustment.current = true;
    hasManualStarsAcc.current = true;
    setStars(value);

    const rawPp = ScoreSaberCurve.getPp(value, accuracy);
    const weightedGain = ScoreSaberCurve.getRawPpForWeightedPpGain(scoresPpsArray, rawPp);
    const { newStars, newAcc, newDesiredPp } = adjustForBounds(weightedGain, false, value, accuracy);

    if (newAcc !== accuracy) updateAccuracy(newAcc);
    if (newStars !== value) setStars(newStars);
    setDesiredPpGain(newDesiredPp);

    setTimeout(() => {
      isManualAdjustment.current = false;
    }, 0);
  };

  return (
    <div className="flex w-full flex-col gap-4 md:gap-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <>
          {/* Desired +PP Slider */}
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="pp-gain-slider" className="text-sm font-semibold sm:text-base">
                Desired +PP
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm font-medium">
                  +{formatPp(desiredPpGain)}pp
                </span>
                <Button variant="outline" size="sm" onClick={handleReset} className="touch-manipulation">
                  Reset
                </Button>
              </div>
            </div>
            <Slider
              id="pp-gain-slider"
              value={[desiredPpGain]}
              onValueChange={value => handleDesiredPpChange(value[0])}
              min={MIN_DESIRED_PP}
              max={MAX_DESIRED_PP}
              step={0.5}
              labelPosition="none"
              className="w-full touch-manipulation"
            />
          </div>

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
                <span className="text-muted-foreground text-sm font-medium">{stars.toFixed(1)}★</span>
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

          <RawPpDisplay desiredPpGain={desiredPpGain} targetRawPp={targetRawPp} />

          {targetRawPp && (
            <AccuracyThresholdTable targetRawPp={targetRawPp} getStarsForAcc={getStarsForAcc} />
          )}
        </>
      )}
    </div>
  );
}
