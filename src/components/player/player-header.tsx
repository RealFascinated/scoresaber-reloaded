import { formatNumberWithCommas, formatPp } from "@/common/number-utils";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import Card from "../card";
import CountryFlag from "../country-flag";
import { Avatar, AvatarImage } from "../ui/avatar";
import ClaimProfile from "./claim-profile";
import PlayerStats from "./player-stats";
import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";
import Tooltip from "@/components/tooltip";
import { ReactElement } from "react";
import PlayerTrackedStatus from "@/components/player/player-tracked-status";

/**
 * Renders the change for a stat.
 *
 * @param change the amount of change
 * @param tooltip the tooltip to display
 * @param format the function to format the value
 */
const renderChange = (
  change: number,
  tooltip: ReactElement,
  format?: (value: number) => string,
) => {
  format = format ?? formatNumberWithCommas;

  return (
    <Tooltip display={tooltip}>
      <p
        className={`text-sm ${change > 0 ? "text-green-400" : "text-red-400"}`}
      >
        {change > 0 ? "+" : ""}
        {format(change)}
      </p>
    </Tooltip>
  );
};

const playerData = [
  {
    showWhenInactiveOrBanned: false,
    icon: () => {
      return <GlobeAmericasIcon className="h-5 w-5" />;
    },
    render: (player: ScoreSaberPlayer) => {
      const statisticChange = player.statisticChange;
      const rankChange = statisticChange?.rank ?? 0;

      return (
        <div className="text-gray-300 flex gap-1 items-center">
          <p>#{formatNumberWithCommas(player.rank)}</p>
          {rankChange != 0 &&
            renderChange(
              rankChange,
              <p>The change in your rank compared to yesterday</p>,
            )}
        </div>
      );
    },
  },
  {
    showWhenInactiveOrBanned: false,
    icon: (player: ScoreSaberPlayer) => {
      return <CountryFlag code={player.country} size={15} />;
    },
    render: (player: ScoreSaberPlayer) => {
      const statisticChange = player.statisticChange;
      const rankChange = statisticChange?.countryRank ?? 0;

      return (
        <div className="text-gray-300 flex gap-1 items-center">
          <p>#{formatNumberWithCommas(player.countryRank)}</p>
          {rankChange != 0 &&
            renderChange(
              rankChange,
              <p>The change in your rank compared to yesterday</p>,
            )}
        </div>
      );
    },
  },
  {
    showWhenInactiveOrBanned: true,
    render: (player: ScoreSaberPlayer) => {
      const statisticChange = player.statisticChange;
      const ppChange = statisticChange?.pp ?? 0;

      return (
        <div className="text-pp flex gap-1 items-center">
          <p>{formatPp(player.pp)}pp</p>
          {ppChange != 0 &&
            renderChange(
              ppChange,
              <p>The change in your pp compared to yesterday</p>,
              (number) => {
                return `${formatPp(number)}pp`;
              },
            )}
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
            <div className="flex gap-2 items-center justify-center lg:justify-start">
              <p className="font-bold text-2xl">{player.name}</p>
              <PlayerTrackedStatus player={player} />
            </div>
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
