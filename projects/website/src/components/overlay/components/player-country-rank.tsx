import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import CountryFlag from "@/components/country-flag";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { DailyChange } from "@/components/statistic/daily-change";
import { PlayerStatChange } from "@ssr/common/player/player-stat-change";

type OverlayPlayerRankProps = {
  /**
   * The player to display information for.
   */
  player: ScoreSaberPlayer;
};
export default function OverlayPlayerCountryRank({ player }: OverlayPlayerRankProps) {
  const { countryRank, country } = player;

  return (
    <div className="flex gap-2 items-center">
      <div className="flex gap-2 items-center">
        <CountryFlag code={country} size={18} />
        <p>#{formatNumberWithCommas(countryRank)}</p>
      </div>
      <DailyChange
        type={PlayerStatChange.CountryRank}
        change={player.statisticChange?.daily?.countryRank ?? 0}
        className="text-md"
      />
    </div>
  );
}
