import { DailyChange } from "@/components/statistic/daily-change";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatChange } from "@ssr/common/player/player-stat-change";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";

type OverlayPlayerRankProps = {
  /**
   * The player to display information for.
   */
  player: ScoreSaberPlayer;
};

export default function OverlayPlayerRank({ player }: OverlayPlayerRankProps) {
  const rank = player.rank;

  return (
    <div className="flex gap-2 items-center">
      <div className="flex gap-2 items-center">
        <GlobeAmericasIcon className="w-8 h-8" />
        <p>#{formatNumberWithCommas(rank)}</p>
      </div>
      <DailyChange
        type={PlayerStatChange.Rank}
        change={player.statisticChange?.daily?.rank ?? 0}
        className="text-md"
      />
    </div>
  );
}
