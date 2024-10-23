import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { getPageFromRank } from "@ssr/common/utils/utils";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import { ScoreTimeSet } from "@/components/score/score-time-set";

type Props = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
};

export default function ScoreRankInfo({ score, leaderboard }: Props) {
  return (
    <div className="flex w-full flex-row justify-between lg:w-[125px] lg:flex-col lg:justify-center items-center">
      <div className="flex gap-1 items-center">
        <GlobeAmericasIcon className="w-5 h-5" />
        <Link href={`/leaderboard/${leaderboard.id}/${getPageFromRank(score.rank, 12)}`}>
          <p className="text-ssr cursor-default hover:brightness-[66%] transition-all transform-gpu cursor-pointer">
            #{formatNumberWithCommas(score.rank)}
          </p>
        </Link>
      </div>
      <ScoreTimeSet score={score} />
    </div>
  );
}
