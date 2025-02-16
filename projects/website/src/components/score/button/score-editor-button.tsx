import Tooltip from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FaCog, FaUndo } from "react-icons/fa";

type ScoreEditorButtonProps = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  updateScore: (score: ScoreSaberScore) => void;
};

export default function ScoreEditorButton({
  score,
  leaderboard,
  updateScore,
}: ScoreEditorButtonProps) {
  const maxScore = leaderboard.maxScore || 1; // Use 1 to prevent division by zero
  const accuracy = (score.score / maxScore) * 100;

  const isMobile = useIsMobile();
  const [newAccuracy, setNewAccuracy] = useState(accuracy);

  const { data: rankedPps } = useQuery({
    queryKey: ["ranked-pps", score.playerId],
    queryFn: () => ssrApi.getPlayerRankedPps(score.playerId),
  });

  const handleSliderChange = (value: number[]) => {
    const newAccuracy = Math.max(0, Math.min(value[0], 100)); // Ensure the accuracy stays within 0-100
    const newBaseScore = (newAccuracy / 100) * maxScore;
    updateScore({
      ...score,
      score: newBaseScore,
    });
    setNewAccuracy(newAccuracy);
  };

  const handleSliderReset = () => {
    updateScore({
      ...score,
      score: (accuracy / 100) * maxScore,
    });
    setNewAccuracy(accuracy);
  };

  const ppGain = rankedPps
    ? scoresaberService.getPpBoundaryForRawPp(
        rankedPps.pps,
        scoresaberService.getPp(leaderboard.stars, newAccuracy)
      )
    : 0;

  return (
    <div className="flex items-center justify-center cursor-default relative">
      <Popover
        onOpenChange={open => {
          handleSliderReset();
        }}
      >
        <PopoverTrigger>
          <Tooltip display={<p>Edit Score Accuracy</p>}>
            <FaCog className="size-6 p-0.5 cursor-pointer hover:animate-spin-slow" />
          </Tooltip>
        </PopoverTrigger>
        <PopoverContent className="p-0" side={isMobile ? "top" : "left"}>
          <div className="p-3 flex flex-col gap-4">
            {/* Accuracy Changer */}
            <div className="flex flex-col w-full gap-2">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium mb-1">Accuracy Changer</p>

                {/* Reset Button */}
                <Tooltip display={<p>Set accuracy to score accuracy</p>}>
                  <Button onClick={handleSliderReset} className="p-1 h-fit" variant="ghost">
                    <FaUndo className="size-3.5" />
                  </Button>
                </Tooltip>
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
              <p className="text-sm font-medium ">Accuracy - {newAccuracy.toFixed(2)}%</p>

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
