import { ScoreBadgeProps } from "@/components/platform/scoresaber/score/badges/badge-props";
import SimpleTooltip from "@/components/simple-tooltip";
import { SharedIcons } from "@/shared-icons";
import { ScoreSaberMedalScore } from "@ssr/common/schemas/scoresaber/score/medal-score";

export function ScoreMedalsBadge({ score }: ScoreBadgeProps) {
  if ("medals" in score) {
    return (
      <SimpleTooltip display="The amount of medals this score awarded the player" className="h-full">
        <div className="flex h-full items-center gap-1">
          <SharedIcons.MedalsIcon className="h-4 w-4" />
          <span className="text-sm font-medium">{(score as ScoreSaberMedalScore).medals}</span>
        </div>
      </SimpleTooltip>
    );
  }
}
