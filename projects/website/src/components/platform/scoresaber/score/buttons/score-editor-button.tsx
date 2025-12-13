import SimpleTooltip from "@/components/simple-tooltip";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useIsMobile } from "@/contexts/viewport-context";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Modifier } from "@ssr/common/score/modifier";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";
import { updateScoreWeights } from "@ssr/common/utils/scoresaber.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FaCog, FaFlagCheckered, FaUndo } from "react-icons/fa";

type ScoreEditorButtonProps = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  updateScore: (score: ScoreSaberScore) => void;
};

const MIN_ACCURACY = 70;

export default function ScoreSaberScoreEditorButton({ score, leaderboard, updateScore }: ScoreEditorButtonProps) {
  const maxScore = leaderboard.maxScore || 1; // Use 1 to prevent division by zero
  const accuracy = (score.score / maxScore) * 100 * (score.modifiers.includes(Modifier.NF) ? 0.5 : 1);

  const isMobile = useIsMobile();
  const [baseValue, setBaseValue] = useState(Math.max(MIN_ACCURACY, Math.floor(accuracy))); // 1, 2, 3, etc.
  const [decimalValue, setDecimalValue] = useState(accuracy - Math.floor(accuracy)); // 0.0, 0.1, 0.2, etc.

  const { data: rankedPps } = useQuery({
    queryKey: ["ranked-pps", score.playerId],
    queryFn: () => ssrApi.getPlayerRankedPps(score.playerId),
  });

  const [modifiedScores, setModifiedScores] = useState<Pick<ScoreSaberScore, "pp" | "weight" | "scoreId">[]>();

  const updateScoreAndPP = (accuracy: number) => {
    const newBaseScore = (accuracy / 100) * maxScore;
    updateScore({
      ...score,
      score: newBaseScore,
    });

    if (rankedPps) {
      let newModifiedScores = [...rankedPps.scores];
      for (let i = 0; i < newModifiedScores.length; i++) {
        const modifiedScore = newModifiedScores[i];
        if (score.scoreId == modifiedScore.scoreId) {
          newModifiedScores[i] = {
            ...modifiedScore,
            pp: ScoreSaberCurve.getPp(leaderboard.stars, accuracy),
          };
        }
      }
      newModifiedScores = newModifiedScores.sort((a, b) => b.pp - a.pp);
      updateScoreWeights(newModifiedScores);

      setModifiedScores(newModifiedScores);
    }
  };

  const handleBaseSliderChange = (value: number[]) => {
    const baseVal = Math.max(1, Math.min(value[0], 100));
    setBaseValue(baseVal);
    const accuracy = baseVal + decimalValue;
    updateScoreAndPP(accuracy);
  };

  const handleDecimalSliderChange = (value: number[]) => {
    const decimalVal = Math.max(0, Math.min(value[0], 0.99));
    setDecimalValue(decimalVal);
    const accuracy = baseValue + decimalVal;
    updateScoreAndPP(accuracy);
  };

  const handleSliderReset = () => {
    updateScore({
      ...score,
      score: (accuracy / 100) * maxScore,
    });
    setBaseValue(Math.max(1, Math.floor(accuracy)));
    setDecimalValue(accuracy - Math.floor(accuracy));
  };

  const setAccuracyToFC = () => {
    const fcAccuracy = score.additionalData!.fcAccuracy!;
    setBaseValue(Math.max(1, Math.floor(fcAccuracy)));
    setDecimalValue(fcAccuracy - Math.floor(fcAccuracy));
    updateScoreAndPP(fcAccuracy);
  };

  const ppGain =
    !rankedPps || !modifiedScores
      ? 0
      : ScoreSaberCurve.getTotalWeightedPp(modifiedScores.map(score => score.pp)) -
        ScoreSaberCurve.getTotalWeightedPp(rankedPps.scores.map(score => score.pp));

  return (
    <div className="relative flex cursor-default items-center justify-center">
      <Popover
        onOpenChange={open => {
          if (!open) {
            // Reset when closing
            handleSliderReset();
            setModifiedScores(undefined);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="ghost" className="h-[28px] w-[28px] p-0">
            <FaCog className="size-4" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="p-0" side={isMobile ? "top" : "left"}>
          <div className="flex flex-col gap-4 p-3">
            {/* Accuracy Changer */}
            <div className="flex w-full flex-col gap-(--spacing-lg)">
              <div className="flex items-center justify-between">
                <p>Accuracy Changer</p>

                <div className="flex items-center gap-2">
                  {/* Set to FC Button */}
                  {score.additionalData !== undefined && !score.fullCombo && (
                    <SimpleTooltip
                      display={
                        <p>Set accuracy to FC Accuracy ({formatScoreAccuracy(score.additionalData!.fcAccuracy!)})</p>
                      }
                    >
                      <Button onClick={setAccuracyToFC} className="h-fit p-1.5" variant="ghost">
                        <FaFlagCheckered className="size-3.5" />
                      </Button>
                    </SimpleTooltip>
                  )}

                  {/* Reset Button */}
                  <SimpleTooltip display={<p>Set accuracy to score accuracy</p>}>
                    <Button onClick={handleSliderReset} className="h-fit p-1.5" variant="ghost">
                      <FaUndo className="size-3.5" />
                    </Button>
                  </SimpleTooltip>
                </div>
              </div>

              <div className="flex w-full flex-col gap-(--spacing-md)">
                {/* Base Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-muted-foreground text-sm">Base</label>
                    <span className="text-muted-foreground text-sm">{baseValue}</span>
                  </div>
                  <Slider
                    className="w-full"
                    min={MIN_ACCURACY}
                    max={99}
                    step={1}
                    value={[baseValue]}
                    onValueChange={handleBaseSliderChange}
                  />
                </div>

                {/* Decimal Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-muted-foreground text-sm">Decimal</label>
                    <span className="text-muted-foreground text-sm">{decimalValue.toFixed(2)}</span>
                  </div>
                  <Slider
                    className="w-full"
                    min={0}
                    max={0.99}
                    step={0.01}
                    value={[decimalValue]}
                    onValueChange={handleDecimalSliderChange}
                  />
                </div>
              </div>
            </div>

            {/* PP Gain */}
            {rankedPps && leaderboard.ranked && (
              <p className="text-muted-foreground text-sm">
                Weighted PP Gain: <b className="text-pp">{ppGain > 0.1 ? ppGain.toFixed(2) : 0}pp</b>
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
