import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";

type OverlayPlayerRankProps = {
  /**
   * The rank of the player.
   */
  rank: number;
};

export default function OverlayPlayerRank({ rank }: OverlayPlayerRankProps) {
  return (
    <div className="flex gap-2 items-center">
      <GlobeAmericasIcon className="w-8 h-8" />
      <p>#{formatNumberWithCommas(rank)}</p>
    </div>
  );
}
