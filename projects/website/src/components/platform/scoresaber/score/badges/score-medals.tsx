import { ScoreBadgeProps } from "@/components/platform/scoresaber/score/badges/badge-props";
import SimpleTooltip from "@/components/simple-tooltip";
import { Medal } from "lucide-react";

export function ScoreMedalsBadge({ score }: ScoreBadgeProps) {
  if ("medals" in score) {
    return (
      <SimpleTooltip display="The amount of medals this score awarded the player">
        <div className="flex items-center gap-1">
          <Medal className="h-4 w-4" />
          <span className="text-sm font-medium">{score.medals}</span>
        </div>
      </SimpleTooltip>
    );
  }
}
