import { FollowingRanking } from "@/components/player-home/following/following-ranking";
import { FollowingScores } from "@/components/player-home/following/following-scores";
import { Player } from "@/components/player-home/player";

export default function HomePage() {
  return (
    <div className="flex w-full flex-col gap-4">
      <Player />
      <div className="flex w-full flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="flex w-full shrink-0 flex-col gap-4 lg:w-[32rem]">
          <FollowingRanking />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <FollowingScores />
        </div>
      </div>
    </div>
  );
}
