import ScoreSaberPlayer from "@/common/data-fetcher/types/scoresaber/scoresaber-player";
import { formatNumberWithCommas } from "@/common/number-utils";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import Card from "../card";
import CountryFlag from "../country-flag";
import { Avatar, AvatarImage } from "../ui/avatar";
import ClaimProfile from "./claim-profile";
import PlayerDataPoint from "./player-data-point";

const playerSubNames = [
  {
    icon: () => {
      return <GlobeAmericasIcon className="h-5 w-5" />;
    },
    render: (player: ScoreSaberPlayer) => {
      return <p>#{formatNumberWithCommas(player.rank)}</p>;
    },
  },
  {
    icon: (player: ScoreSaberPlayer) => {
      return <CountryFlag country={player.country.toLowerCase()} size={15} />;
    },
    render: (player: ScoreSaberPlayer) => {
      return <p>#{formatNumberWithCommas(player.countryRank)}</p>;
    },
  },
  {
    render: (player: ScoreSaberPlayer) => {
      return <p className="text-pp">{formatNumberWithCommas(player.pp)}pp</p>;
    },
  },
];

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerHeader({ player }: Props) {
  return (
    <Card>
      <div className="flex gap-3 flex-col items-center text-center sm:flex-row sm:items-start sm:text-start relative select-none">
        <Avatar className="w-32 h-32 pointer-events-none">
          <AvatarImage fetchPriority="high" src={player.profilePicture} />
        </Avatar>
        <div>
          <p className="font-bold text-2xl">{player.name}</p>
          <div className="flex gap-2">
            {playerSubNames.map((subName, index) => {
              return (
                <PlayerDataPoint icon={subName.icon && subName.icon(player)} key={index}>
                  {subName.render(player)}
                </PlayerDataPoint>
              );
            })}
          </div>
          <div className="absolute top-0 right-0">
            <ClaimProfile playerId={player.id} />
          </div>
        </div>
      </div>
    </Card>
  );
}
