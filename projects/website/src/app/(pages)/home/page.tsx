import { getServerSession } from "@/common/auth/session-server";
import { FollowingRanking } from "@/components/player-home/following/following-ranking";
import { FollowingScores } from "@/components/player-home/following/following-scores";
import { prefetchHomeData } from "@/components/player-home/home-prefetch";
import { Player } from "@/components/player-home/player";
import { HydrationBoundary } from "@tanstack/react-query";
import { cookies } from "next/headers";

export default async function HomePage() {
  // The layout resolves the same session, which is shared within the request
  const session = await getServerSession((await cookies()).toString());
  const homeData = await prefetchHomeData(session);

  const content = (
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

  return homeData ? <HydrationBoundary state={homeData}>{content}</HydrationBoundary> : content;
}
