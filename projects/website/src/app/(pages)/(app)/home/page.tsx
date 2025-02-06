import { FriendRanking } from "@/components/home/friend-ranking";
import { FriendScores } from "@/components/home/friend-scores";
import { PlayerPreview } from "@/components/home/player-preview";

export default async function HomePage() {
  return (
    <main className="flex flex-col w-full gap-2 2xl:flex-row">
      <article className="flex flex-col gap-2 w-full 2xl:w-[600px]">
        <PlayerPreview />
        <FriendRanking />
      </article>
      <article className="flex-1">
        <FriendScores />
      </article>
    </main>
  );
}
