"use client";

import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatPp } from "@ssr/common/utils/number-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const ACC_THRESHOLDS = [92, 93, 94, 95, 96, 97, 98, 99];
const DEFAULT_ACC = 95;
const MAX_STARS = 15;

export default function PlusPpCalculator({ player }: { player: ScoreSaberPlayer }) {
  const scoreSaberService = ApiServiceRegistry.getInstance().getScoreSaberService();

  // State
  const [ppValue, setPpValue] = useState(1);
  const [accuracy, setAccuracy] = useState(DEFAULT_ACC);
  const [stars, setStars] = useState(10);
  const [isPpUserInput, setIsPpUserInput] = useState(false);
  const hasInitialized = useRef(false);

  const { data: rankedPps } = useQuery({
    queryKey: ["ranked-pps", player.id],
    queryFn: () => ssrApi.getPlayerRankedPps(player.id),
  });

  const sortedScores = useMemo(
    () => rankedPps?.scores?.map(score => score.pp).sort((a, b) => b - a) ?? [],
    [rankedPps?.scores]
  );

  // Calculate raw PP needed for the current PP value
  const rawPp = useMemo(() => {
    if (!sortedScores.length) return 0;
    return scoreSaberService.calcPpBoundary(sortedScores, ppValue);
  }, [scoreSaberService, sortedScores, ppValue]);

  // Calculate stars needed for each accuracy threshold with constraint
  const getStarsForAcc = useCallback(
    (rawPp: number, acc: number) => {
      if (!rawPp || !acc) return 0;

      let calculatedStars = 0;
      let adjustedAccuracy = acc;

      // If the calculated star is more than the max, increase the acc 1% until it's below the max star count
      do {
        const ppFactor = scoreSaberService.getModifier(adjustedAccuracy);
        calculatedStars = rawPp / (scoreSaberService.STAR_MULTIPLIER * ppFactor);

        if (calculatedStars > MAX_STARS && adjustedAccuracy < 100) {
          adjustedAccuracy += 1;
        } else {
          break;
        }
      } while (calculatedStars > MAX_STARS && adjustedAccuracy < 100);

      return calculatedStars;
    },
    [scoreSaberService]
  );

  // Calculate stars and adjusted accuracy with constraint
  const getStarsAndAccuracyForPp = useCallback(
    (rawPp: number, acc: number) => {
      if (!rawPp || !acc) return { stars: 0, accuracy: acc };

      let calculatedStars = 0;
      let adjustedAccuracy = acc;

      // If the calculated star is more than the max, increase the acc 1% until it's below the max star count
      do {
        const ppFactor = scoreSaberService.getModifier(adjustedAccuracy);
        calculatedStars = rawPp / (scoreSaberService.STAR_MULTIPLIER * ppFactor);

        if (calculatedStars > MAX_STARS && adjustedAccuracy < 100) {
          adjustedAccuracy += 1;
        } else {
          break;
        }
      } while (calculatedStars > MAX_STARS && adjustedAccuracy < 100);

      return { stars: calculatedStars, accuracy: adjustedAccuracy };
    },
    [scoreSaberService]
  );

  // Calculate PP from stars and accuracy
  const getPpFromStarsAndAcc = useCallback(
    (stars: number, acc: number) => scoreSaberService.getPp(stars, acc),
    [scoreSaberService]
  );

  // Calculate what PP gain you would get from current stars/accuracy
  const calculatedPpGain = useMemo(() => {
    if (!sortedScores.length) return 0;
    const ppFromStars = getPpFromStarsAndAcc(stars, accuracy);
    return scoreSaberService.getPpBoundaryForRawPp(sortedScores, ppFromStars);
  }, [sortedScores, stars, accuracy, getPpFromStarsAndAcc, scoreSaberService]);

  // Calculate max PP
  const maxPp = useMemo(() => {
    if (!sortedScores.length) return 100;
    const maxPossiblePp = scoreSaberService.getPp(MAX_STARS, 100);
    const maxBoundaryPp = scoreSaberService.getPpBoundaryForRawPp(sortedScores, maxPossiblePp);
    return Math.min(maxBoundaryPp, 100);
  }, [sortedScores, scoreSaberService]);

  // Initialize stars based on 95% accuracy and +1pp when data loads
  useEffect(() => {
    if (sortedScores.length > 0 && rawPp > 0 && !hasInitialized.current) {
      const { stars: initialStars, accuracy: adjustedAccuracy } = getStarsAndAccuracyForPp(
        rawPp,
        DEFAULT_ACC
      );
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

  return (
    <div className="flex flex-col gap-4">
      {/* Main PP Display Card */}
      <div className="rounded-lg border border-blue-500/20 bg-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xl font-semibold text-blue-400">+{formatPp(ppValue)}pp</span>
            <span className="text-muted-foreground text-sm">{formatPp(rawPp)}pp Raw</span>
          </div>
          <div className="text-muted-foreground flex flex-col items-end gap-1 text-sm">
            <span className="text-green-400">{accuracy.toFixed(1)}% accuracy</span>
            <span className="text-yellow-400">{stars.toFixed(2)}★ difficulty</span>
          </div>
        </div>
      </div>

      {/* Controls Card */}
      <div className="border-border/50 bg-background/50 rounded-lg border p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Calculator</h3>
        </div>
        <div className="space-y-4">
          {/* PP Slider */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Desired +PP:{" "}
              <span className="font-semibold text-blue-400">{formatPp(ppValue)}pp</span>
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
            <Label className="text-sm font-medium">
              Accuracy: <span className="font-semibold text-green-400">{accuracy.toFixed(1)}%</span>
            </Label>
            <Slider
              value={[accuracy]}
              onValueChange={([value]) => value !== undefined && handleAccuracyChange(value)}
              max={100}
              min={70}
              step={0.1}
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
