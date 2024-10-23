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

export function ScoreTimeSet({ score }: ScoreTimeSetProps) {
  return (
    <Tooltip
      display={
        <p>
          {format({
            date: new Date(score.timestamp),
            format: "DD MMMM YYYY HH:mm a",
          })}
        </p>
      }
    >
      <p className="text-sm cursor-default select-none">{timeAgo(new Date(score.timestamp))}</p>
    </Tooltip>
  );
}
