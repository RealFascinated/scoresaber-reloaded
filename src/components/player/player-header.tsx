import ScoreSaberPlayer from "@/common/service/types/scoresaber/scoresaber-player";
import { formatNumberWithCommas } from "@/common/number-utils";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import Card from "../card";
import CountryFlag from "../country-flag";
import { Avatar, AvatarImage } from "../ui/avatar";
import ClaimProfile from "./claim-profile";
import PlayerStats from "./player-stats";

const playerData = [
  {
    showWhenInactiveOrBanned: false,
    icon: () => {
      return <GlobeAmericasIcon className="h-5 w-5" />;
    },
    render: (player: ScoreSaberPlayer) => {
      return <p>#{formatNumberWithCommas(player.rank)}</p>;
    },
  },
  {
    showWhenInactiveOrBanned: false,
    icon: (player: ScoreSaberPlayer) => {
      return <CountryFlag country={player.country.toLowerCase()} size={15} />;
    },
    render: (player: ScoreSaberPlayer) => {
      return <p>#{formatNumberWithCommas(player.countryRank)}</p>;
    },
  },
  {
    showWhenInactiveOrBanned: true,
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
      <div className="flex gap-3 flex-col items-center text-center lg:flex-row lg:items-start lg:text-start relative select-none">
        <Avatar className="w-32 h-32 pointer-events-none">
          <AvatarImage alt="Profile Picture" src={player.profilePicture} />
        </Avatar>
        <div className="w-full flex gap-2 flex-col justify-center items-center lg:justify-start lg:items-start">
          <div>
            <p className="font-bold text-2xl">{player.name}</p>
            <div className="flex flex-col">
              <div>
                {player.inactive && (
                  <p className="text-gray-400">Inactive Account</p>
                )}
                {player.banned && (
                  <p className="text-red-500">Banned Account</p>
                )}
              </div>
              <div className="flex gap-2">
                {playerData.map((subName, index) => {
                  // Check if the player is inactive or banned and if the data should be shown
                  if (
                    !subName.showWhenInactiveOrBanned &&
                    (player.inactive || player.banned)
                  ) {
                    return null;
                  }

                  return (
                    <div key={index} className="flex gap-1 items-center">
                      {subName.icon && subName.icon(player)}
                      {subName.render && subName.render(player)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <PlayerStats player={player} />

          <div className="absolute top-0 right-0">
            <ClaimProfile playerId={player.id} />
          </div>
        </div>
      </div>
    </Card>
  );
}
