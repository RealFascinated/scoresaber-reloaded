import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import CountryFlag from "@/components/country-flag";

type OverlayPlayerRankProps = {
  /**
   * The crank of the player in their country.
   */
  countryRank: number;

  /**
   * The country of the player.
   */
  country: string;
};

export default function OverlayPlayerCountryRank({ countryRank, country }: OverlayPlayerRankProps) {
  return (
    <div className="flex gap-2 items-center">
      <CountryFlag code={country} size={18} />
      <p>#{formatNumberWithCommas(countryRank)}</p>
    </div>
  );
}
