import SimpleTooltip from "@/components/simple-tooltip";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useIsMobile } from "@/hooks/use-is-mobile";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Modifier } from "@ssr/common/score/modifier";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";
import { updateScoreWeights } from "@ssr/common/utils/scoresaber.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FaCheck, FaCog, FaUndo } from "react-icons/fa";

type ScoreEditorButtonProps = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  updateScore: (score: ScoreSaberScore) => void;
};

export default function ScoreSaberScoreEditorButton({
  score,
  leaderboard,
  updateScore,
}: ScoreEditorButtonProps) {
  const maxScore = leaderboard.maxScore || 1; // Use 1 to prevent division by zero
  const accuracy =
    (score.score / maxScore) * 100 * (score.modifiers.includes(Modifier.NF) ? 0.5 : 1);

  const isMobile = useIsMobile();
  const [newAccuracy, setNewAccuracy] = useState(accuracy);

  const { data: rankedPps } = useQuery({
    queryKey: ["ranked-pps", score.playerId],
    queryFn: () => ssrApi.getPlayerRankedPps(score.playerId),
  });

  const [modifiedScores, setModifiedScores] =
    useState<Pick<ScoreSaberScore, "pp" | "weight" | "scoreId">[]>();

  const handleSliderChange = (value: number[]) => {
    const newAccuracy = Math.max(0, Math.min(value[0], 100)); // Ensure the accuracy stays within 0-100
    const newBaseScore = (newAccuracy / 100) * maxScore;
    updateScore({
      ...score,
      score: newBaseScore,
    });
    setNewAccuracy(newAccuracy);

    if (rankedPps) {
      let newModifiedScores = [...rankedPps.scores];
      for (let i = 0; i < newModifiedScores.length; i++) {
        const modifiedScore = newModifiedScores[i];
        if (score.scoreId == modifiedScore.scoreId) {
          newModifiedScores[i] = {
            ...modifiedScore,
            pp: ApiServiceRegistry.getInstance()
              .getScoreSaberService()
              .getPp(leaderboard.stars, newAccuracy),
          };
        }
      }
      newModifiedScores = newModifiedScores.sort((a, b) => b.pp - a.pp);
      updateScoreWeights(newModifiedScores);

      setModifiedScores(newModifiedScores);
    }
  };

  const handleSliderReset = () => {
    updateScore({
      ...score,
      score: (accuracy / 100) * maxScore,
    });
    setNewAccuracy(accuracy);
  };

  const ppGain = useMemo(() => {
    if (!rankedPps || !modifiedScores) {
      return 0;
    }

    return (
      ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .getTotalWeightedPp(modifiedScores.map(score => score.pp)) -
      ApiServiceRegistry.getInstance()
        .getScoreSaberService()
        .getTotalWeightedPp(rankedPps.scores.map(score => score.pp))
    );
  }, [modifiedScores, rankedPps]);

  return (
    <div className="relative flex cursor-default items-center justify-center">
      <Popover onOpenChange={() => handleSliderReset()}>
        <PopoverTrigger asChild>
          <SimpleTooltip display="Edit the scores accuracy">
            <Button variant="ghost" className="h-[28px] w-[28px] p-0">
              <FaCog className="size-4" />
            </Button>
          </SimpleTooltip>
        </PopoverTrigger>
        <PopoverContent className="p-0" side={isMobile ? "top" : "left"}>
          <div className="flex flex-col gap-4 p-3">
            {/* Accuracy Changer */}
            <div className="flex w-full flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="mb-1 text-sm font-medium">Accuracy Changer</p>

                <div className="flex items-center gap-2">
                  {/* Set to FC Button */}
                  {score.additionalData !== undefined && !score.fullCombo && (
                    <SimpleTooltip
                      display={
                        <p>
                          Set accuracy to FC Accuracy (
                          {formatScoreAccuracy(score.additionalData!.fcAccuracy!)})
                        </p>
                      }
                    >
                      <Button
                        onClick={() => handleSliderChange([score.additionalData!.fcAccuracy!])}
                        className="h-fit p-1"
                        variant="ghost"
                      >
                        <FaCheck className="size-3.5" />
                      </Button>
                    </SimpleTooltip>
                  )}

                  {/* Reset Button */}
                  <SimpleTooltip display={<p>Set accuracy to score accuracy</p>}>
                    <Button onClick={handleSliderReset} className="h-fit p-1" variant="ghost">
                      <FaUndo className="size-3.5" />
                    </Button>
                  </SimpleTooltip>
                </div>
              </div>

              {/* Accuracy Slider */}
              <Slider
                className="w-full"
                min={accuracy}
                max={100}
                step={0.01}
                onValueChange={handleSliderChange}
              />
            </div>

            <div>
              {/* Current Accuracy */}
              <p className="text-sm font-medium">Accuracy - {newAccuracy.toFixed(2)}%</p>

              {/* PP Gain */}
              {rankedPps && leaderboard.ranked && (
                <p className="text-sm font-medium">
                  Global PP Gain - {ppGain > 0.1 ? ppGain.toFixed(2) : 0}pp
                </p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
