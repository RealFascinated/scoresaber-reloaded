import { FriendRanking } from "@/components/home/friend/friend-ranking";
import { FriendScores } from "@/components/home/friend/friend-scores";
import { PlayerPreview } from "@/components/home/player-preview";

export default function HomePage() {
  return (
    <main className="flex w-full flex-col gap-2 2xl:flex-row">
      <article className="flex w-full flex-col gap-2 2xl:w-[600px]">
        <PlayerPreview />
        <FriendRanking />
      </article>
      <article className="flex-1">
        <FriendScores />
      </article>
    </main>
  );
}
