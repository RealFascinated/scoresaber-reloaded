import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import Card from "../card";
import CountryFlag from "../country-flag";
import ClaimProfile from "./claim-profile";
import PlayerStats from "./player-stats";
import PlayerTrackedStatus from "@/components/player/player-tracked-status";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import Link from "next/link";
import AddFriend from "@/components/friend/add-friend";
import PlayerSteamProfile from "@/components/player/player-steam-profile";
import { getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import { DailyChange } from "@/components/statistic/daily-change";
import { ChangeOverTime } from "@/components/statistic/change-over-time";
import { PlayerStatChange } from "@ssr/common/player/player-stat-change";
import Avatar from "@/components/avatar";
import PlayerBeatLeaderLink from "@/components/player/player-beatleader-link";
import SnipePlaylistDownloadButton from "@/components/snipe/snipe-playlist-creation";
import PlayerScoreChartButton from "@/components/player/player-score-chart-button";

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
          <ChangeOverTime player={player} type={PlayerStatChange.Rank}>
            <Link prefetch={false} href={`/ranking/${player.rankPages.global}`}>
              <p className="hover:brightness-[66%] transition-all transform-gpu">
                #{formatNumberWithCommas(player.rank)}
              </p>
            </Link>
          </ChangeOverTime>
          <DailyChange type={PlayerStatChange.Rank} change={rankChange} />
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
          <ChangeOverTime player={player} type={PlayerStatChange.CountryRank}>
            <Link prefetch={false} href={`/ranking/${player.country}/${player.rankPages.country}`}>
              <p className="hover:brightness-[66%] transition-all transform-gpu">
                #{formatNumberWithCommas(player.countryRank)}
              </p>
            </Link>
          </ChangeOverTime>
          <DailyChange type={PlayerStatChange.CountryRank} change={rankChange} />
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
          <ChangeOverTime player={player} type={PlayerStatChange.PerformancePoints}>
            <p className="hover:brightness-[66%] transition-all transform-gpu text-pp">{formatPp(player.pp)}pp</p>
          </ChangeOverTime>
          <DailyChange type={PlayerStatChange.PerformancePoints} change={ppChange} />
        </div>
      );
    },
  },
];

type PlayerHeaderProps = {
  /**
   * The player to display.
   */
  player: ScoreSaberPlayer;
};

export default function PlayerHeader({ player }: PlayerHeaderProps) {
  return (
    <Card>
      <div className="flex gap-3 flex-col items-center text-center lg:flex-row lg:items-start lg:text-start relative select-none">
        <Avatar
          src={player.avatar}
          size={128}
          className="w-32 h-32 pointer-events-none"
          alt={`${player.name}'s Profile Picture`}
        />
        <div className="w-full flex gap-2 flex-col justify-center items-center lg:justify-start lg:items-start">
          <div>
            <div className="flex gap-2 items-center justify-center lg:justify-start">
              <p
                className="font-bold text-2xl"
                style={{
                  color: getScoreSaberRoles(player)[0]?.color,
                }}
              >
                {player.name}
              </p>
              <div className="absolute lg:relative top-0 left-0 flex flex-col lg:flex-row gap-2 items-center">
                <PlayerTrackedStatus player={player} />
                <PlayerSteamProfile player={player} />
                <PlayerBeatLeaderLink player={player} />
                {player.isBeingTracked && <SnipePlaylistDownloadButton toSnipe={player} />}
                {player.isBeingTracked && <PlayerScoreChartButton player={player} />}
              </div>
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

          <div className="absolute top-0 right-0 gap-2 flex flex-col lg:flex-row">
            <AddFriend player={player} />
            <ClaimProfile playerId={player.id} />
          </div>
        </div>
      </div>
    </Card>
  );
}
