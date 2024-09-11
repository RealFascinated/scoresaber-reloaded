import ScoreSaberPlayerScore from "@/app/common/leaderboard/types/scoresaber/scoresaber-player-score";
import { timeAgo } from "@/app/common/time-utils";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import Image from "next/image";

type Props = {
  /**
   * The score to display.
   */
  playerScore: ScoreSaberPlayerScore;
};

export default function Score({ playerScore }: Props) {
  const { score, leaderboard } = playerScore;

  return (
    <div className="grid gap-2 md:gap-0 grid-cols-1 pb-2 pt-2 first:pt-0 last:pb-0 grid-cols-[20px 1fr] md:grid-cols-[0.85fr_6fr_1.3fr]">
      <div className="flex w-full flex-row justify-between items-center md:w-[125px] md:justify-center md:flex-col">
        <div className="flex gap-1 items-center">
          <GlobeAmericasIcon className="w-5 h-5" />
          <p className="text-pp">#{score.rank}</p>
        </div>
        <p className="text-sm">{timeAgo(new Date(score.timeSet))}</p>
      </div>
      <div className="flex gap-3">
        <Image
          unoptimized
          src={leaderboard.coverImage}
          width={64}
          height={64}
          alt="Song Artwork"
          className="rounded-md"
        />
        <div className="flex">
          <div className="flex flex-col">
            <p>{leaderboard.songName}</p>
            <p className="text-sm">{leaderboard.songAuthorName}</p>
            <p className="text-sm">{leaderboard.levelAuthorName}</p>
          </div>
        </div>
      </div>
      <div className="flex justify-end">stats stuff</div>
    </div>
  );
}
