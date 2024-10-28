import { format } from "@formkit/tempo";
import { timeAgo } from "@ssr/common/utils/time-utils";
import Tooltip from "@/components/tooltip";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";

type ScoreTimeSetProps = {
  /**
   * The score that was set.
   */
  score: ScoreSaberScore;
};

export function ScoreTimeSetVs({ score }: ScoreTimeSetProps) {
  if (!score.previousScore) {
    return undefined;
  }

  return (
    <Tooltip
      display={
        <p>
          {format({
            date: new Date(score.previousScore.timestamp),
            format: "DD MMMM YYYY HH:mm a",
          })}
        </p>
      }
    >
      <div>
        <div className="text-xs text-gray-400 flex flex-row gap-2 items-center">
          <p>vs</p>
          <p>{timeAgo(new Date(score.previousScore.timestamp))}</p>
        </div>
      </div>
    </Tooltip>
  );
}
