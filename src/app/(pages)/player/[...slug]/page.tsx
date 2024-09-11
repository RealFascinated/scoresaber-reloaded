import { scoresaberLeaderboard } from "@/app/common/leaderboard/impl/scoresaber";
import { ScoreSort } from "@/app/common/leaderboard/sort";
import { formatNumberWithCommas } from "@/app/common/number-utils";
import PlayerData from "@/app/components/player/player-data";
import { format } from "@formkit/tempo";
import { Metadata } from "next";
import { redirect } from "next/navigation";

type Props = {
  params: {
    slug: string[];
  };
};

export async function generateMetadata({ params: { slug } }: Props): Promise<Metadata> {
  const id = slug[0]; // The players id
  const player = await scoresaberLeaderboard.lookupPlayer(id, false);
  if (player === undefined) {
    return {
      title: `Unknown Player`,
      openGraph: {
        title: `Unknown Player`,
      },
    };
  }

  return {
    title: `${player.name}`,
    openGraph: {
      title: `ScoreSaber Reloaded - ${player.name}`,
      description: `
      PP: ${formatNumberWithCommas(player.pp)}pp
      Rank: #${formatNumberWithCommas(player.rank)} (#${formatNumberWithCommas(player.countryRank)} ${player.country})
      Joined ScoreSaber: ${format(player.firstSeen, { date: "medium", time: "short" })}
      
      View the scores for ${player.name}!`,
    },
  };
}

export default async function Search({ params: { slug } }: Props) {
  const id = slug[0]; // The players id
  const sort: ScoreSort = (slug[1] as ScoreSort) || "recent"; // The sorting method
  const page = parseInt(slug[2]) || 1; // The page number
  const player = await scoresaberLeaderboard.lookupPlayer(id, false);

  if (player == undefined) {
    // Invalid player id
    return redirect("/");
  }

  return (
    <div className="flex flex-col h-full w-full">
      <PlayerData initalPlayerData={player} sort={sort} page={page} />
    </div>
  );
}
