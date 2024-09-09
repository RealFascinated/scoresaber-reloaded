import { scoresaberLeaderboard } from "@/app/common/leaderboard/impl/scoresaber";
import { ScoreSort } from "@/app/common/leaderboard/sort";
import ScoreSaberPlayer from "@/app/common/leaderboard/types/scoresaber/scoresaber-player";
import { formatNumberWithCommas } from "@/app/common/number-utils";
import ClaimProfile from "@/app/components/player/claim-profile";
import PlayerSubName from "@/app/components/player/player-sub-name";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { format } from "@formkit/tempo";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { Metadata } from "next";

const playerSubNames = [
  {
    icon: <GlobeAmericasIcon className="h-5 w-5" />,
    render: (player: ScoreSaberPlayer) => {
      return <p>#{formatNumberWithCommas(player.rank)}</p>;
    },
  },
  {
    icon: <GlobeAmericasIcon className="h-5 w-5" />,
    render: (player: ScoreSaberPlayer) => {
      return <p>#{formatNumberWithCommas(player.countryRank)}</p>;
    },
  },
  {
    render: (player: ScoreSaberPlayer) => {
      return <p className="tex-pp">{formatNumberWithCommas(player.pp)}pp</p>;
    },
  },
];

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
  const page = slug[2] || 1; // The page number
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
            <div className="flex gap-3 flex-col items-center text-center sm:flex-row sm:items-start sm:text-start relative select-none">
              <Avatar className="w-32 h-32 pointer-events-none">
                <AvatarImage src={player.profilePicture} />
                <AvatarFallback>{player.name}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-2xl">{player.name}</p>
                <div className="flex gap-2">
                  {playerSubNames.map((subName, index) => {
                    return (
                      <PlayerSubName icon={subName.icon} key={index}>
                        {subName.render(player)}
                      </PlayerSubName>
                    );
                  })}
                  {/* <PlayerSubName icon={<GlobeAmericasIcon className="size-6" />}>
                    <p>#{formatNumberWithCommas(player.rank)}</p>
                  </PlayerSubName>
                  <PlayerSubName icon={<GlobeAmericasIcon className="size-6" />}>
                    <p>#{formatNumberWithCommas(player.countryRank)}</p>
                  </PlayerSubName>
                  <PlayerSubName>
                    <p className="text-pp">{formatNumberWithCommas(player.pp)}pp</p>
                  </PlayerSubName> */}
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
