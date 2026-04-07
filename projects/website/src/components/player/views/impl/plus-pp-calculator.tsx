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
const DEFAULT_ACCURACY = 95;
const DEFAULT_STARS = 10;

/**
 * Gets the stars needed to achieve `rawPp` at a given accuracy.
 *
 * @param rawPp the raw pp to achieve
 * @param acc the accuracy to achieve
 * @returns the stars needed
 */
function starsForRawPpAtAcc(rawPp: number, acc: number): number {
  return rawPp / (ScoreSaberCurve.STAR_MULTIPLIER * ScoreSaberCurve.getModifier(acc));
}

function RawPpDisplay({ label, value, onReset }: { label: string; value: string; onReset: () => void }) {
  return (
    <div className="bg-muted/50 border-border flex flex-col gap-2 rounded-lg border px-4 pt-3 pb-4 md:px-5 md:pt-4 md:pb-5">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-muted-foreground text-xs font-medium sm:text-sm">{label}</Label>
        <Button variant="outline" size="sm" onClick={onReset} className="touch-manipulation">
          Reset
        </Button>
      </div>
      <p className="text-xl font-bold sm:text-2xl">{value}</p>
    </div>
  );
}

function AccuracyThresholdTable({ targetRawPp, showDashes }: { targetRawPp: number; showDashes: boolean }) {
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
              {ACCURACY_THRESHOLDS.map(threshold => (
                <td
                  key={threshold}
                  className="px-2 py-2 text-center font-mono text-xs sm:px-4 sm:py-3 sm:text-sm"
                >
                  {showDashes ? "-" : `${starsForRawPpAtAcc(targetRawPp, threshold).toFixed(2)}★`}
                </td>
              ))}
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

  const sortedPps = useMemo(
    () => [...(scorePps?.scores.map(s => s.pp) ?? [])].sort((a, b) => b - a),
    [scorePps]
  );

  const rawPpFromPlay = useMemo(() => ScoreSaberCurve.getPp(stars, accuracy), [stars, accuracy]);

  /** Unrounded weighted pp gain from the current star/accuracy combo. */
  const weightedGain = useMemo(
    () => (sortedPps.length === 0 ? 0 : ScoreSaberCurve.getRawPpForWeightedPpGain(sortedPps, rawPpFromPlay)),
    [sortedPps, rawPpFromPlay]
  );

  const isNegativeGain = weightedGain < 0;

  /**
   * Raw PP that must be scored on *some* map to yield the desired pp gain.
   * When gain is negative the slider value itself is shown instead.
   */
  const targetRawPp = useMemo((): number | null => {
    if (sortedPps.length === 0) {
      return null;
    }
    if (isNegativeGain) {
      return rawPpFromPlay;
    }

    // Round to 1 dp to match the displayed label, but fall back to the
    // unrounded value if rounding would collapse a tiny gain to zero.
    const gainForInverse = Math.max(Math.round(weightedGain * 10) / 10, weightedGain > 0 ? weightedGain : 0);
    return gainForInverse > 0
      ? ScoreSaberCurve.calcRawPpForExpectedPp(sortedPps, gainForInverse)
      : rawPpFromPlay;
  }, [sortedPps, weightedGain, isNegativeGain, rawPpFromPlay]);

  const handleReset = () => {
    setAccuracy(DEFAULT_ACCURACY);
    if (sortedPps.length === 0) {
      setStars(DEFAULT_STARS);
      return;
    }
    const rawPpForOnePp = ScoreSaberCurve.calcRawPpForExpectedPp(sortedPps, 1);
    const resetStars =
      Math.round(
        Math.min(Math.max(starsForRawPpAtAcc(rawPpForOnePp, DEFAULT_ACCURACY), 0), SHARED_CONSTS.maxStars) *
          10
      ) / 10;
    setStars(resetStars);
  };

  // Derived display values
  const roundedGain = Math.max(0, Math.round(weightedGain * 10) / 10);
  const displayLabel = isNegativeGain
    ? "Raw PP for current play"
    : `Raw PP needed for +${formatPp(roundedGain)}pp`;
  const displayValue = isNegativeGain
    ? `${formatPp(rawPpFromPlay)}pp`
    : targetRawPp != null && Number.isFinite(targetRawPp)
      ? `${formatPp(targetRawPp)}pp`
      : "Unknown";

  return (
    <div className="flex w-full flex-col gap-4 md:gap-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            {(
              [
                {
                  id: "accuracy-slider",
                  label: "Accuracy",
                  value: accuracy,
                  display: `${accuracy.toFixed(2)}%`,
                  min: 85,
                  max: 100,
                  step: 0.01,
                  onChange: setAccuracy,
                },
                {
                  id: "stars-slider",
                  label: "Stars",
                  value: stars,
                  display: `${stars.toFixed(1)} ★`,
                  min: 0,
                  max: SHARED_CONSTS.maxStars,
                  step: 0.1,
                  onChange: setStars,
                },
              ] as const
            ).map(({ id, label, value, display, min, max, step, onChange }) => (
              <div key={id} className="flex flex-col gap-3 md:gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor={id} className="text-sm font-semibold sm:text-base">
                    {label}
                  </Label>
                  <span className="text-muted-foreground text-sm font-medium">{display}</span>
                </div>
                <Slider
                  id={id}
                  value={[value]}
                  onValueChange={([v]) => onChange(v)}
                  min={min}
                  max={max}
                  step={step}
                  labelPosition="none"
                  className="w-full touch-manipulation"
                />
              </div>
            ))}
          </div>

          <RawPpDisplay label={displayLabel} value={displayValue} onReset={handleReset} />

          {targetRawPp != null && (
            <AccuracyThresholdTable targetRawPp={targetRawPp} showDashes={isNegativeGain} />
          )}
        </>
      )}
    </div>
  );
}
