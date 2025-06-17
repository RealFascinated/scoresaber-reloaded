import { getRankBgColor } from "@/common/color-utils";
import { cn } from "@/common/utils";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import CountryFlag from "../country-flag";

type CountryRankDisplayProps = {
  countryRank: number;
  country: string;
  className?: string;
  flagSize?: number;
};

export function CountryRankDisplay({
  countryRank,
  country,
  className,
  flagSize = 14,
}: CountryRankDisplayProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <span
        className={cn(
          "flex min-h-[22px] items-center gap-1 rounded px-1 py-1 text-xs font-semibold",
          getRankBgColor(countryRank)
        )}
      >
        <CountryFlag code={country} size={flagSize} />#{formatNumberWithCommas(countryRank)}
      </span>
    </div>
  );
}
