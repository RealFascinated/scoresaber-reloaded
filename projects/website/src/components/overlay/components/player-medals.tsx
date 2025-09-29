import { DailyChange } from "@/components/statistic/daily-change";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatChange } from "@ssr/common/player/player-stat-change";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { FaMedal } from "react-icons/fa";

type OverlayPlayerMedalsProps = {
  /**
   * The player to display information for.
   */
  player: ScoreSaberPlayer;
};

export default function OverlayPlayerMedals({ player }: OverlayPlayerMedalsProps) {
  const { medals } = player;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-3">
        <div className="flex w-6 justify-center">
          <FaMedal className="h-6 w-6 text-slate-300" />
        </div>
        <p className="text-2xl font-bold">{formatNumberWithCommas(medals)}</p>
      </div>
      <DailyChange
        type={PlayerStatChange.Medals}
        change={player.statisticChange?.daily?.medals ?? 0}
        className="text-lg"
        useTooltip={false}
      />
    </div>
  );
}
