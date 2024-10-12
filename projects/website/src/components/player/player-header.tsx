import { formatNumberWithCommas, formatPp } from "@/common/number-utils";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import Card from "../card";
import CountryFlag from "../country-flag";
import { Avatar, AvatarImage } from "../ui/avatar";
import ClaimProfile from "./claim-profile";
import PlayerStats from "./player-stats";
import Tooltip from "@/components/tooltip";
import { ReactElement } from "react";
import PlayerTrackedStatus from "@/components/player/player-tracked-status";
import ScoreSaberPlayer from "@ssr/common/types/player/impl/scoresaber-player";
import Link from "next/link";
import { capitalizeFirstLetter } from "@/common/string-utils";

/**
 * Renders the change for a stat.
 *
 * @param change the amount of change
 * @param tooltip the tooltip to display
 * @param format the function to format the value
 */
const renderDailyChange = (change: number, tooltip: ReactElement, format?: (value: number) => string) => {
  format = format ?? formatNumberWithCommas;

  return (
    <Tooltip display={tooltip}>
      <p className={`text-sm ${change > 0 ? "text-green-400" : "text-red-400"}`}>
        {change > 0 ? "+" : ""}
        {format(change)}
      </p>
    </Tooltip>
  );
};

/**
 * Renders the change over time a stat eg: rank, country rank
 *
 * @param player the player to get the stats for
 * @param children the children to render
 * @param type the type of stat to get the change for
 */
const renderChange = (player: ScoreSaberPlayer, type: "rank" | "countryRank" | "pp", children: ReactElement) => {
  const todayStats = player.statisticChange?.daily;
  const weeklyStats = player.statisticChange?.weekly;
  const monthlyStats = player.statisticChange?.monthly;
  const todayStat = todayStats?.[type];
  const weeklyStat = weeklyStats?.[type];
  const monthlyStat = monthlyStats?.[type];

  const renderChange = (value: number | undefined, timeFrame: "daily" | "weekly" | "monthly") => {
    const format = (value: number | undefined) => {
      if (value == 0) {
        return 0;
      }
      if (value == undefined) {
        return "No Data";
      }
      return type == "pp" ? formatPp(value) + "pp" : formatNumberWithCommas(value);
    };

    return (
      <p>
        {capitalizeFirstLetter(timeFrame)} Change:{" "}
        <span
          className={`${value == undefined ? "" : value >= 0 ? (value == 0 ? "" : "text-green-500") : "text-red-500"}`}
        >
          {format(value)}
        </span>
      </p>
    );
  };

  return (
    <Tooltip
      side="bottom"
      display={
        <div>
          {renderChange(todayStat, "daily")}
          {renderChange(weeklyStat, "weekly")}
          {renderChange(monthlyStat, "monthly")}
        </div>
      }
    >
      {children}
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
      const rankChange = statisticChange?.daily?.rank ?? 0;

      return (
        <div className="text-gray-300 flex gap-1 items-center">
          {renderChange(
            player,
            "rank",
            <Link href={`/ranking/${player.rankPages.global}`}>
              <p className="hover:brightness-75 transition-all transform-gpu">#{formatNumberWithCommas(player.rank)}</p>
            </Link>
          )}
          {rankChange != 0 && renderDailyChange(rankChange, <p>The change in rank compared to yesterday</p>)}
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
      const rankChange = statisticChange?.daily?.countryRank ?? 0;

      return (
        <div className="text-gray-300 flex gap-1 items-center">
          {renderChange(
            player,
            "countryRank",
            <Link href={`/ranking/${player.country}/${player.rankPages.country}`}>
              <p className="hover:brightness-75 transition-all transform-gpu">
                #{formatNumberWithCommas(player.countryRank)}
              </p>
            </Link>
          )}
          {rankChange != 0 && renderDailyChange(rankChange, <p>The change in country rank compared to yesterday</p>)}
        </div>
      );
    },
  },
  {
    showWhenInactiveOrBanned: true,
    render: (player: ScoreSaberPlayer) => {
      const statisticChange = player.statisticChange;
      const ppChange = statisticChange?.daily?.pp ?? 0;

      return (
        <div className="text-gray-300 flex gap-1 items-center">
          {renderChange(
            player,
            "pp",
            <p className="hover:brightness-75 transition-all transform-gpu text-pp">{formatPp(player.pp)}pp</p>
          )}
          {ppChange != 0 && renderDailyChange(ppChange, <p>The change in pp compared to yesterday</p>)}
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
          <AvatarImage alt="Profile Picture" src={`https://img.fascinated.cc/upload/w_128,h_128/${player.avatar}`} />
        </Avatar>
        <div className="w-full flex gap-2 flex-col justify-center items-center lg:justify-start lg:items-start">
          <div>
            <div className="flex gap-2 items-center justify-center lg:justify-start">
              <p className="font-bold text-2xl">{player.name}</p>
              <PlayerTrackedStatus player={player} />
            </div>
            <div className="flex flex-col">
              <div>
                {player.inactive && <p className="text-gray-400">Inactive Account</p>}
                {player.banned && <p className="text-red-500">Banned Account</p>}
              </div>
              <div className="flex gap-2 flex-wrap justify-center items-center lg:justify-start lg:items-start">
                {playerData.map((subName, index) => {
                  // Check if the player is inactive or banned and if the data should be shown
                  if (!subName.showWhenInactiveOrBanned && (player.inactive || player.banned)) {
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
