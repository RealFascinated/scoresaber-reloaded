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

export default function PlusPpCalculator({ player }: { player: ScoreSaberPlayer }) {
  const { data: scorePps, isLoading } = useQuery({
    queryKey: ["scorePps", player.id],
    queryFn: () => ssrApi.getPlayerPps(player.id),
  });

  const [desiredPpGain, setDesiredPpGain] = useState(1);
  const [accuracy, setAccuracy] = useState(95);
  const [stars, setStars] = useState(10);
  const isManualAdjustment = useRef(false);
  const hasManualStarsAcc = useRef(false);
  const accuracyRef = useRef(95);

  // Calculate raw PP needed for desired weighted PP gain
  const targetRawPp = useMemo(() => {
    if (!scorePps) return null;
    const scoresPpsArray = scorePps.scores.map(score => score.pp);
    if (scoresPpsArray.length === 0) return null;
    return ScoreSaberCurve.calcRawPpForExpectedPp(scoresPpsArray, desiredPpGain);
  }, [scorePps, desiredPpGain]);

  // Helper to get stars needed for a given accuracy and raw PP
  const getStarsForAcc = (rawPp: number, acc: number) => {
    return rawPp / (ScoreSaberCurve.STAR_MULTIPLIER * ScoreSaberCurve.getModifier(acc));
  };

  // Helper to get accuracy needed for a given stars and raw PP
  const getAccForStars = (rawPp: number, stars: number) => {
    const modifierNeeded = rawPp / (stars * ScoreSaberCurve.STAR_MULTIPLIER);
    // Binary search for accuracy that gives this modifier
    let low = 75;
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

  // Update accuracy ref when accuracy changes
  useEffect(() => {
    accuracyRef.current = accuracy;
  }, [accuracy]);

  // When target raw PP changes, calculate stars from current accuracy (like Svelte)
  useEffect(() => {
    if (!targetRawPp || isManualAdjustment.current || hasManualStarsAcc.current) return;

    // Calculate stars from rawPp and current accuracy
    let newStars = getStarsForAcc(targetRawPp, accuracyRef.current);
    
    // If stars would be < 0.5, increase stars instead
    if (newStars < 0.5) {
      newStars = 0.5;
      const newAcc = getAccForStars(targetRawPp, newStars);
      accuracyRef.current = newAcc;
      setAccuracy(newAcc);
      setStars(newStars);
    } else if (newStars > SHARED_CONSTS.maxStars) {
      // Cap stars at max and recalculate accuracy
      newStars = SHARED_CONSTS.maxStars;
      const newAcc = getAccForStars(targetRawPp, newStars);
      accuracyRef.current = newAcc;
      setAccuracy(newAcc);
      setStars(newStars);
    } else {
      setStars(Math.round(newStars * 10) / 10);
    }
  }, [targetRawPp, scorePps]);

  // When user changes desired PP directly, reset manual flag so stars/accuracy recalculate
  const handleDesiredPpChange = (value: number) => {
    hasManualStarsAcc.current = false;
    setDesiredPpGain(value);
  };

  // Reset to default values
  const handleReset = () => {
    hasManualStarsAcc.current = false;
    setDesiredPpGain(1);
    // Stars and accuracy will be recalculated by the useEffect
  };

  // When user changes accuracy/stars, update that value and update desired PP gain
  const handleAccuracyChange = (value: number) => {
    isManualAdjustment.current = true;
    hasManualStarsAcc.current = true;
    accuracyRef.current = value;
    setAccuracy(value);
    // Update desired PP gain based on new accuracy
    if (scorePps) {
      const scoresPpsArray = scorePps.scores.map(score => score.pp);
      if (scoresPpsArray.length > 0) {
        let rawPp = ScoreSaberCurve.getPp(stars, value);
        let weightedGain = ScoreSaberCurve.getRawPpForWeightedPpGain(scoresPpsArray, rawPp);
        
        // If weighted gain < 0.5, increase stars to get at least 0.5
        if (weightedGain < 0.5) {
          const targetRawPp = ScoreSaberCurve.calcRawPpForExpectedPp(scoresPpsArray, 0.5);
          let newStars = getStarsForAcc(targetRawPp, value);
          
          if (newStars > SHARED_CONSTS.maxStars) {
            newStars = SHARED_CONSTS.maxStars;
            const newAcc = getAccForStars(targetRawPp, newStars);
            accuracyRef.current = newAcc;
            setAccuracy(newAcc);
          }
          setStars(Math.round(newStars * 10) / 10);
          setDesiredPpGain(0.5);
        } else if (weightedGain > 100) {
          // If weighted gain > 100, lower stars to get at most 100
          const targetRawPp = ScoreSaberCurve.calcRawPpForExpectedPp(scoresPpsArray, 100);
          let newStars = getStarsForAcc(targetRawPp, value);
          
          if (newStars < 0.1) {
            newStars = 0.1;
            const newAcc = getAccForStars(targetRawPp, newStars);
            accuracyRef.current = newAcc;
            setAccuracy(newAcc);
          }
          setStars(Math.round(newStars * 10) / 10);
          setDesiredPpGain(100);
        } else {
          setDesiredPpGain(Math.round(weightedGain * 10) / 10);
        }
      }
    }
    setTimeout(() => {
      isManualAdjustment.current = false;
    }, 0);
  };

  const handleStarsChange = (value: number) => {
    isManualAdjustment.current = true;
    hasManualStarsAcc.current = true;
    setStars(value);
    // Update desired PP gain based on new stars
    if (scorePps) {
      const scoresPpsArray = scorePps.scores.map(score => score.pp);
      if (scoresPpsArray.length > 0) {
        let rawPp = ScoreSaberCurve.getPp(value, accuracy);
        let weightedGain = ScoreSaberCurve.getRawPpForWeightedPpGain(scoresPpsArray, rawPp);
        
        // If weighted gain < 0.5, increase accuracy to get at least 0.5
        if (weightedGain < 0.5) {
          const targetRawPp = ScoreSaberCurve.calcRawPpForExpectedPp(scoresPpsArray, 0.5);
          let newAcc = getAccForStars(targetRawPp, value);
          
          if (newAcc > 100) {
            newAcc = 100;
            let newStars = getStarsForAcc(targetRawPp, 100);
            if (newStars > SHARED_CONSTS.maxStars) {
              newStars = SHARED_CONSTS.maxStars;
            }
            setStars(Math.round(newStars * 10) / 10);
          }
          accuracyRef.current = newAcc;
          setAccuracy(newAcc);
          setDesiredPpGain(0.5);
        } else if (weightedGain > 100) {
          // If weighted gain > 100, lower accuracy to get at most 100
          const targetRawPp = ScoreSaberCurve.calcRawPpForExpectedPp(scoresPpsArray, 100);
          let newAcc = getAccForStars(targetRawPp, value);
          
          if (newAcc < 75) {
            newAcc = 75;
            let newStars = getStarsForAcc(targetRawPp, 75);
            if (newStars < 0.1) {
              newStars = 0.1;
            }
            setStars(Math.round(newStars * 10) / 10);
          }
          accuracyRef.current = newAcc;
          setAccuracy(newAcc);
          setDesiredPpGain(100);
        } else {
          setDesiredPpGain(Math.round(weightedGain * 10) / 10);
        }
      }
    }
    setTimeout(() => {
      isManualAdjustment.current = false;
    }, 0);
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <>
          {/* Desired +PP Slider */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="pp-gain-slider" className="text-base font-semibold">
                Desired +PP
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm font-medium">
                  +{formatPp(desiredPpGain)}pp
                </span>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Reset
                </Button>
              </div>
            </div>
            <Slider
              id="pp-gain-slider"
              value={[desiredPpGain]}
              onValueChange={value => handleDesiredPpChange(value[0])}
              min={0.5}
              max={100}
              step={0.5}
              labelPosition="none"
              className="w-full"
            />
          </div>

          {/* Accuracy and Stars Sliders */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-4">
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
                onValueChange={value => handleAccuracyChange(value[0])}
                min={85}
                max={100}
                step={0.01}
                labelPosition="none"
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-4">
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
                onValueChange={value => handleStarsChange(value[0])}
                min={0}
                max={SHARED_CONSTS.maxStars}
                step={0.1}
                labelPosition="none"
                className="w-full"
              />
            </div>
          </div>

          {/* Raw PP Display */}
          <div className="bg-muted/50 border-border flex flex-col gap-2 rounded-lg border p-5">
            <Label className="text-muted-foreground text-sm font-medium">
              Raw PP needed for +{formatPp(desiredPpGain)}pp
            </Label>
            <p className="text-2xl font-bold">
              {targetRawPp ? `${formatPp(targetRawPp)}pp` : "Calculating..."}
            </p>
          </div>

          {/* Stars Table */}
          {scorePps && targetRawPp && (
            <div className="bg-muted/30 border-border overflow-hidden rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-border border-b bg-muted/30">
                      {[92, 93, 94, 95, 96, 97, 98, 99].map(threshold => (
                        <th key={threshold} className="px-4 py-3 text-center text-sm font-medium">
                          {threshold}%
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {[92, 93, 94, 95, 96, 97, 98, 99].map(threshold => {
                        const starsForAcc =
                          targetRawPp /
                          (ScoreSaberCurve.STAR_MULTIPLIER *
                            ScoreSaberCurve.getModifier(threshold));
                        return (
                          <td key={threshold} className="px-4 py-3 text-center text-sm">
                            {starsForAcc > SHARED_CONSTS.maxStars
                              ? "—"
                              : `${starsForAcc.toFixed(2)}★`}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
