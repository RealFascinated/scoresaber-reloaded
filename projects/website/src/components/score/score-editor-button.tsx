import { Button } from "@/components/ui/button";
import { CogIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ResetIcon } from "@radix-ui/react-icons";
import Tooltip from "@/components/tooltip";
import ScoreSaberScore from "@ssr/common/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";

type ScoreEditorButtonProps = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  updateScore: (score: ScoreSaberScore) => void;
};

export default function ScoreEditorButton({ score, leaderboard, updateScore }: ScoreEditorButtonProps) {
  const [isScoreEditMode, setIsScoreEditMode] = useState(false);

  const maxScore = leaderboard.maxScore || 1; // Use 1 to prevent division by zero
  const accuracy = (score.score / maxScore) * 100;

  const handleSliderChange = (value: number[]) => {
    const newAccuracy = Math.max(0, Math.min(value[0], 100)); // Ensure the accuracy stays within 0-100
    const newBaseScore = (newAccuracy / 100) * maxScore;
    updateScore({
      ...score,
      score: newBaseScore,
    });
  };

  const handleSliderReset = () => {
    updateScore({
      ...score,
      score: (accuracy / 100) * maxScore,
    });
  };

  return (
    <div className="flex items-center justify-center cursor-default relative">
      <Popover
        onOpenChange={open => {
          setIsScoreEditMode(open);
          handleSliderReset();
        }}
      >
        <PopoverTrigger>
          <CogIcon className={clsx("w-6 h-6 transition-all transform-gpu p-0", isScoreEditMode ? "" : "rotate-180")} />
        </PopoverTrigger>
        <PopoverContent className="p-0" side="left">
          <div className="p-3 flex flex-col gap-2">
            <p className="text-sm font-medium mb-1">Accuracy Changer</p>
            {/* Accuracy Slider */}
            <Slider className="w-full" min={accuracy} max={100} step={0.01} onValueChange={handleSliderChange} />

            <Tooltip display={<p>Set accuracy to score accuracy</p>}>
              {/* Reset Button (Changes accuracy back to the original accuracy) */}
              <Button onClick={handleSliderReset} className="absolute top-1 right-1 p-1" variant="ghost">
                <ResetIcon className="w-4 h-4" />
              </Button>
            </Tooltip>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
