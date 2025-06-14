import SimpleTooltip from "@/components/simple-tooltip";
import { format } from "@formkit/tempo";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { timeAgo } from "@ssr/common/utils/time-utils";

export function ScoreSaberScoreTimeSetVs({ score }: { score: ScoreSaberScore }) {
  if (!score.previousScore) {
    return undefined;
  }

  return (
    <SimpleTooltip
      display={
        <p>
          {format({
            date: new Date(score.previousScore.timestamp),
            format: "DD MMMM YYYY HH:mm a",
          })}
        </p>
      }
      showOnMobile
    >
      <div>
        <div className="text-xs text-gray-400 flex flex-row gap-2 items-center">
          <p>vs</p>
          <p>{timeAgo(new Date(score.previousScore.timestamp))}</p>
        </div>
      </div>
    </SimpleTooltip>
  );
}
