"use client";

import SimpleTooltip from "@/components/simple-tooltip";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import useDatabase from "@/hooks/use-database";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MAX_STARS = 15;

export default function PlusPpCalculator({ player }: { player: ScoreSaberPlayer }) {
  const database = useDatabase();

  // State for default accuracy
  const [defaultAccuracy, setDefaultAccuracy] = useState(95);

  // Load default accuracy from database
  useEffect(() => {
    const loadDefaultAccuracy = async () => {
      const accuracy = await database.getPlusPpDefaultAccuracy();
      setDefaultAccuracy(accuracy ?? 95);
    };
    loadDefaultAccuracy();
  }, [database]);

  // Update accuracy when defaultAccuracy loads
  useEffect(() => {
    setAccuracy(defaultAccuracy);
  }, [defaultAccuracy]);

  // State
  const [ppValue, setPpValue] = useState(1);
  const [accuracy, setAccuracy] = useState(defaultAccuracy);
  const [stars, setStars] = useState(10);
  const [isPpUserInput, setIsPpUserInput] = useState(false);
  const hasInitialized = useRef(false);

  const { data: rankedPps } = useQuery({
    queryKey: ["ranked-pps", player.id],
    queryFn: () => ssrApi.getPlayerPps(player.id),
  });

  const sortedScores = useMemo(
    () => rankedPps?.scores?.map(score => score.pp).sort((a, b) => b - a) ?? [],
    [rankedPps?.scores]
  );

  // Calculate raw PP needed for the current PP value
  const rawPp = useMemo(() => {
    if (!sortedScores.length) return 0;
    return ScoreSaberCurve.calcRawPpForExpectedPp(sortedScores, ppValue);
  }, [sortedScores, ppValue]);

  // Calculate stars and adjusted accuracy with constraint
  const getStarsAndAccuracyForPp = useCallback((rawPp: number, acc: number) => {
    if (!rawPp || !acc) return { stars: 0, accuracy: acc };

    let calculatedStars = 0;
    let adjustedAccuracy = acc;

    // If the calculated star is more than the max, increase the acc 1% until it's below the max star count
    do {
      const ppFactor = ScoreSaberCurve.getModifier(adjustedAccuracy);
      calculatedStars = rawPp / (ScoreSaberCurve.STAR_MULTIPLIER * ppFactor);

      if (calculatedStars > MAX_STARS && adjustedAccuracy < 100) {
        adjustedAccuracy += 1;
      } else {
        break;
      }
    } while (calculatedStars > MAX_STARS && adjustedAccuracy < 100);

    return { stars: calculatedStars, accuracy: adjustedAccuracy };
  }, []);

  // Calculate PP from stars and accuracy
  const getPpFromStarsAndAcc = useCallback((stars: number, acc: number) => ScoreSaberCurve.getPp(stars, acc), []);

  // Calculate what PP gain you would get from current stars/accuracy
  const calculatedPpGain = useMemo(() => {
    if (!sortedScores.length) return 0;
    const ppFromStars = getPpFromStarsAndAcc(stars, accuracy);
    return ScoreSaberCurve.calcRawPpForExpectedPp(sortedScores, ppFromStars);
  }, [sortedScores, stars, accuracy, getPpFromStarsAndAcc]);

  // Calculate max PP
  const maxPp = useMemo(() => {
    if (!sortedScores.length) return 100;
    const maxPossiblePp = ScoreSaberCurve.getPp(MAX_STARS, 100);
    const maxBoundaryPp = ScoreSaberCurve.calcRawPpForExpectedPp(sortedScores, maxPossiblePp);
    return Math.min(maxBoundaryPp, 100);
  }, [sortedScores]);

  // Initialize stars based on 95% accuracy and +1pp when data loads
  useEffect(() => {
    if (sortedScores.length > 0 && rawPp > 0 && !hasInitialized.current) {
      const { stars: initialStars, accuracy: adjustedAccuracy } = getStarsAndAccuracyForPp(rawPp, defaultAccuracy);
      setStars(initialStars);
      setAccuracy(adjustedAccuracy);
      hasInitialized.current = true;
    }
  }, [sortedScores, rawPp, getStarsAndAccuracyForPp]);

  // Update PP value when accuracy or stars change (unless user is manually adjusting PP)
  useEffect(() => {
    if (!isPpUserInput && calculatedPpGain > 0 && hasInitialized.current) {
      setPpValue(calculatedPpGain);
    }
  }, [calculatedPpGain, isPpUserInput]);

  // Update accuracy and stars when PP value changes (when user manually adjusts PP)
  useEffect(() => {
    if (isPpUserInput && rawPp > 0 && hasInitialized.current) {
      // Always use getStarsAndAccuracyForPp to ensure stars stay within MAX_STARS limit
      const { stars: newStars, accuracy: newAccuracy } = getStarsAndAccuracyForPp(rawPp, accuracy);
      setStars(newStars);
      setAccuracy(newAccuracy);
    }
  }, [rawPp, isPpUserInput, accuracy, getStarsAndAccuracyForPp]);

  // Handlers
  const handlePpChange = useCallback((newPp: number) => {
    setPpValue(newPp);
    setIsPpUserInput(true);
  }, []);

  const handleAccuracyChange = useCallback((newAcc: number) => {
    setAccuracy(newAcc);
    setIsPpUserInput(false);
  }, []);

  const handleStarsChange = useCallback((newStars: number) => {
    setStars(newStars);
    setIsPpUserInput(false);
  }, []);

  const handleReset = useCallback(() => {
    setPpValue(1);
    setAccuracy(defaultAccuracy);
    // Recalculate stars based on default accuracy and +1pp
    const { stars: resetStars } = getStarsAndAccuracyForPp(
      ScoreSaberCurve.getRawPpForWeightedPpGain(sortedScores, 1),
      defaultAccuracy
    );
    setStars(resetStars);
    setIsPpUserInput(false);
    hasInitialized.current = false;
  }, [defaultAccuracy, getStarsAndAccuracyForPp, sortedScores]);

  return (
    <div className="flex flex-col gap-4">
      {/* Main PP Display Card */}
      <div className="rounded-lg border border-blue-500/20 bg-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-primary text-xl font-semibold">+{formatPp(ppValue)}pp</span>
            <span className="text-muted-foreground text-sm">{formatPp(rawPp)}pp Raw</span>
          </div>
          <div className="text-muted-foreground flex flex-col items-end gap-1 text-sm">
            <span className="text-green-400">{accuracy.toFixed(1)}% accuracy</span>
            <span className="text-yellow-400">{stars.toFixed(2)}★ difficulty</span>
          </div>
        </div>
      </div>

      {/* Controls Card */}
      <div className="border-border bg-background/50 rounded-lg border p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Calculator</h3>
          <SimpleTooltip display={<p>Reset back to the default values</p>}>
            <button
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground flex items-center text-sm transition-colors"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </button>
          </SimpleTooltip>
        </div>
        <div className="space-y-4">
          {/* PP Slider */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Desired +PP: <span className="text-primary font-semibold">{formatPp(ppValue)}pp</span>
            </Label>
            <Slider
              value={[ppValue]}
              onValueChange={([value]) => value !== undefined && handlePpChange(value)}
              max={maxPp}
              min={1}
              step={0.5}
              className="w-full"
            />
          </div>

          <Separator />

          {/* Accuracy Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Accuracy: <span className="font-semibold text-green-400">{accuracy.toFixed(2)}%</span>
              </Label>
              <SimpleTooltip display={<p>Save current accuracy as your default</p>}>
                <button
                  onClick={async () => {
                    await database.setPlusPpDefaultAccuracy(accuracy);
                    setDefaultAccuracy(accuracy);
                  }}
                  className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                >
                  Set as Default
                </button>
              </SimpleTooltip>
            </div>
            <Slider
              value={[accuracy]}
              onValueChange={([value]) => value !== undefined && handleAccuracyChange(value)}
              max={100}
              min={70}
              step={0.01}
              className="w-full"
            />
          </div>

          <Separator />

          {/* Stars Slider */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Stars: <span className="font-semibold text-yellow-400">{stars.toFixed(2)}★</span>
            </Label>
            <Slider
              value={[stars]}
              onValueChange={([value]) => value !== undefined && handleStarsChange(value)}
              max={MAX_STARS}
              min={0.1}
              step={0.01}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
