import { FriendRanking } from "@/components/player-home/friend/friend-ranking";
import { FriendScores } from "@/components/player-home/friend/friend-scores";
import { Player } from "@/components/player-home/player";

export default function HomePage() {
  return (
    <main className="flex w-full flex-col gap-(--spacing-xl) 2xl:flex-row">
      <article className="flex w-full flex-col gap-(--spacing-xl) 2xl:w-[500px]">
        <Player />
        <FriendRanking />
      </article>
      <article className="flex-1">
        <FriendScores />
      </article>
    </main>
  );
}
