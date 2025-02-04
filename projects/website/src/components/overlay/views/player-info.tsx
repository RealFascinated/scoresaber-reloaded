import OverlayPlayerCountryRank from "@/components/overlay/components/player-country-rank";
import { DailyChange } from "@/components/statistic/daily-change";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatChange } from "@ssr/common/player/player-stat-change";
import { formatPp } from "@ssr/common/utils/number-utils";
import OverlayPlayerRank from "../components/player-rank";

type OverlayPlayerInfoProps = {
  /**
   * The player to display information for.
   */
  player: ScoreSaberPlayer;
};

export default function OverlayPlayerInfoView({ player }: OverlayPlayerInfoProps) {
  const plusOnePp = player.statisticChange?.daily?.plusOnePp;

  return (
    <div className="flex gap-2 text-2xl">
      <img
        src={player.avatar}
        alt={`${player.name}'s profile picture`}
        className="rounded-md"
        width={192}
        height={192}
      />
      <div>
        <p className="text-3xl font-semibold">{player.name}</p>
        <p className="text-ssr flex gap-2">
          {formatPp(player.pp)}pp
          <DailyChange
            type={PlayerStatChange.PerformancePoints}
            change={player.statisticChange?.daily?.pp ?? 0}
            className="text-md"
          />
          {!!plusOnePp && <span className="text-muted-foreground">(+1 = {formatPp(plusOnePp)}pp)</span>}
        </p>
        <OverlayPlayerRank player={player} />
        <OverlayPlayerCountryRank player={player} />
      </div>
    </div>
  );
}
