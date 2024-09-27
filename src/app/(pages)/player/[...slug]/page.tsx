import { formatNumberWithCommas, formatPp } from "@/common/number-utils";
import { scoresaberService } from "@/common/service/impl/scoresaber";
import { ScoreSort } from "@/common/service/score-sort";
import PlayerData from "@/components/player/player-data";
import { format } from "@formkit/tempo";
import { Metadata } from "next";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{
    slug: string[];
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const id = slug[0]; // The players id
  const player = await scoresaberService.lookupPlayer(id, false);
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
      PP: ${formatPp(player.pp)}pp
      Rank: #${formatNumberWithCommas(player.rank)} (#${formatPp(player.countryRank)} ${player.country})
      Joined ScoreSaber: ${format(player.firstSeen, { date: "medium", time: "short" })}
      
      View the scores for ${player.name}!`,
    },
  };
}

export default async function Search({ params }: Props) {
  const { slug } = await params;
  const id = slug[0]; // The players id
  const sort: ScoreSort = (slug[1] as ScoreSort) || "recent"; // The sorting method
  const page = parseInt(slug[2]) || 1; // The page number
  const player = await scoresaberService.lookupPlayer(id, false);
  const scores = await scoresaberService.lookupPlayerScores({
    playerId: id,
    sort,
    page,
  });

  if (player == undefined) {
    // Invalid player id
    return redirect("/");
  }

  return (
    <div className="flex flex-col h-full w-full">
      <PlayerData initialPlayerData={player} initialScoreData={scores} sort={sort} page={page} />
    </div>
  );
}
