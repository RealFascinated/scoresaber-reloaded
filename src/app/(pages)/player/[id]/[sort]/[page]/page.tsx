import { scoresaberLeaderboard } from "@/app/common/leaderboard/impl/scoresaber";
import { ScoreSort } from "@/app/common/leaderboard/sort";
import { formatNumberWithCommas } from "@/app/common/number-utils";
import ClaimProfile from "@/app/components/claim-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { format } from "@formkit/tempo";
import { Metadata } from "next";

type Props = {
  params: {
    id: string;
    sort: ScoreSort;
    page: number;
  };
};

export async function generateMetadata({ params: { id } }: Props): Promise<Metadata> {
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

export default async function Search({ params: { id, sort, page } }: Props) {
  const player = await scoresaberLeaderboard.lookupPlayer(id, false);
  console.log("id", id);
  console.log("sort", sort);
  console.log("page", page);

  return (
    <div className="flex flex-col h-full w-full">
      {player === undefined && (
        <div>
          <p>idek mate</p>
        </div>
      )}
      {player !== undefined && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col bg-secondary p-2 rounded-md">
            <div className="flex gap-3 flex-col items-center text-center sm:flex-row sm:items-start sm:text-start relative">
              <Avatar className="w-32 h-32">
                <AvatarImage src={player.profilePicture} />
                <AvatarFallback>{player.name}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-2xl">{player.name}</p>
                <div className="flex gap-2">
                  <p className="text-xl text-gray-400">#{formatNumberWithCommas(player.rank)}</p>
                  <p className="text-xl text-gray-400">#{formatNumberWithCommas(player.countryRank)}</p>
                  <p className="text-xl text-blue-400">{formatNumberWithCommas(player.pp)}pp</p>
                </div>
                <div className="absolute top-0 right-0">
                  <ClaimProfile playerId={id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
