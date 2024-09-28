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
  const response = await scoresaberService.lookupPlayer(id, false);
  if (response === undefined) {
    return {
      title: `Unknown Player`,
      openGraph: {
        title: `Unknown Player`,
      },
    };
  }
  const { player } = response;

  return {
    title: `${player.name}`,
    openGraph: {
      title: `ScoreSaber Reloaded - ${player.name}`,
      description: `
      PP: ${formatPp(player.pp)}pp
      Rank: #${formatNumberWithCommas(player.rank)} (#${formatPp(player.countryRank)} ${player.country})
      Joined ScoreSaber: ${format(player.joinedDate, { date: "medium", time: "short" })}
      
      View the scores for ${player.name}!`,
    },
  };
}

export default async function Search({ params }: Props) {
  const { slug } = await params;
  const id = slug[0]; // The players id
  const sort: ScoreSort = (slug[1] as ScoreSort) || "recent"; // The sorting method
  const page = parseInt(slug[2]) || 1; // The page number
  const response = await scoresaberService.lookupPlayer(id, false);
  if (response == undefined) {
    // Invalid player id
    return redirect("/");
  }

  const scores = await scoresaberService.lookupPlayerScores({
    playerId: id,
    sort,
    page,
  });
  const { player } = response;
  return (
    <div className="flex flex-col h-full w-full">
      <PlayerData
        initialPlayerData={player}
        initialScoreData={scores}
        sort={sort}
        page={page}
      />
    </div>
  );
}
