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
    <div className="flex min-h-[24px] items-center gap-3">
      <div className="flex h-6 items-center gap-2">
        <div className="flex w-[40px] items-center justify-center">
          <FaMedal className="h-6 w-6" />
        </div>
        <div className="h-full w-[1px] bg-white" />
        <p className="font-semibold">{formatNumberWithCommas(medals)}</p>
      </div>
      <DailyChange
        type={PlayerStatChange.Medals}
        change={player.statisticChange?.daily?.medals ?? 0}
        className="text-sm"
        useTooltip={false}
      />
    </div>
  );
}
