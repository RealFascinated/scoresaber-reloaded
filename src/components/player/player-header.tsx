import { formatNumberWithCommas, formatPp } from "@/common/number-utils";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import Card from "../card";
import CountryFlag from "../country-flag";
import { Avatar, AvatarImage } from "../ui/avatar";
import ClaimProfile from "./claim-profile";
import PlayerStats from "./player-stats";
import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";
import Tooltip from "@/components/tooltip";

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
      return <CountryFlag code={player.country} size={15} />;
    },
    render: (player: ScoreSaberPlayer) => {
      return <p>#{formatNumberWithCommas(player.countryRank)}</p>;
    },
  },
  {
    showWhenInactiveOrBanned: true,
    render: (player: ScoreSaberPlayer) => {
      return (
        <div className="text-pp flex gap-1 items-center">
          <p>{formatPp(player.pp)}pp</p>
          <Tooltip display={<p>The change in your pp compared to yesterday</p>}>
            <p
              className={`text-sm ${player.ppChange > 0 ? "text-green-400" : "text-red-400"}`}
            >
              {player.ppChange > 0 ? "+" : ""}
              {formatPp(player.ppChange)}pp
            </p>
          </Tooltip>
        </div>
      );
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
          <AvatarImage alt="Profile Picture" src={player.avatar} />
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
