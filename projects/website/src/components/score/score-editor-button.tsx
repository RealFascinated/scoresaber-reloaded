import { Button } from "@/components/ui/button";
import { CogIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score-saber-score-token";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/score-saber-leaderboard-token";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ResetIcon } from "@radix-ui/react-icons";
import Tooltip from "@/components/tooltip";

type ScoreEditorButtonProps = {
  score: ScoreSaberScoreToken;
  leaderboard: ScoreSaberLeaderboardToken;
  setScore: (score: ScoreSaberScoreToken) => void;
};

export default function ScoreEditorButton({ score, leaderboard, setScore }: ScoreEditorButtonProps) {
  const [isScoreEditMode, setIsScoreEditMode] = useState(false);

  const maxScore = leaderboard.maxScore || 1; // Use 1 to prevent division by zero
  const accuracy = (score.baseScore / maxScore) * 100;

  const handleSliderChange = (value: number[]) => {
    const newAccuracy = Math.max(0, Math.min(value[0], 100)); // Ensure the accuracy stays within 0-100
    const newBaseScore = (newAccuracy / 100) * maxScore;
    setScore({
      ...score,
      baseScore: newBaseScore,
    });
  };

  const handleSliderReset = () => {
    setScore({
      ...score,
      baseScore: (accuracy / 100) * maxScore,
    });
  };

  return (
    <div className="pr-2 flex items-center justify-center cursor-default relative">
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
