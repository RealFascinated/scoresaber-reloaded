import OverlayPlayerCountryRank from "@/components/overlay/components/player-country-rank";
import { DailyChange } from "@/components/statistic/daily-change";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatChange } from "@ssr/common/player/player-stat-change";
import { formatPp } from "@ssr/common/utils/number-utils";
import Image from "next/image";
import OverlayPlayerMedals from "../components/player-medals";
import OverlayPlayerRank from "../components/player-rank";

type OverlayPlayerInfoProps = {
  /**
   * The player to display information for.
   */
  player: ScoreSaberPlayer;
};

export default function OverlayPlayerInfoView({ player }: OverlayPlayerInfoProps) {
  const plusOnePp = player.plusOnePP;

  return (
    <div className="flex gap-2 text-2xl">
      <Image
        src={player.avatar}
        alt={`${player.name}'s profile picture`}
        className="rounded-xl"
        width={192}
        height={192}
      />
      <div className="flex flex-col gap-2">
        <div>
          <p className="text-3xl font-bold">{player.name}</p>
          <p className="text-pp flex gap-2">
            <span className="font-semibold">{formatPp(player.pp)}pp</span>
            <DailyChange
              type={PlayerStatChange.PerformancePoints}
              change={player.statisticChange?.daily?.pp ?? 0}
              className="text-md"
              useTooltip={false}
            />
            {!!plusOnePp && (
              <span className="text-muted-foreground">(+1 = {formatPp(plusOnePp)}pp)</span>
            )}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <OverlayPlayerRank player={player} />
          <OverlayPlayerCountryRank player={player} />
          <OverlayPlayerMedals player={player} />
        </div>
      </div>
    </div>
  );
}
