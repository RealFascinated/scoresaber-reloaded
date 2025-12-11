"use client";

import { SettingIds } from "@/common/database/database";
import { useLeaderboardFilter } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import SimpleTooltip from "@/components/simple-tooltip";
import { Button } from "@/components/ui/button";
import Combobox from "@/components/ui/combo-box";
import CountryFlag from "@/components/ui/country-flag";
import { FilterField, FilterRow, FilterSection } from "@/components/ui/filter-section";
import useDatabase from "@/hooks/use-database";
import { FilterItem } from "@ssr/common/filter-item";
import { countryFilter } from "@ssr/common/utils/country.util";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { FaCheck } from "react-icons/fa";
import { toast } from "sonner";

export default function ScoreSaberLeaderboardFilters() {
  const database = useDatabase();
  const mainPlayer = useStableLiveQuery(() => database.getMainPlayer());
  const filter = useLeaderboardFilter();

  return (
    <FilterSection
      title="Country Filter"
      description="Filter leaderboard scores by country"
      hasActiveFilters={Boolean(filter.country)}
      onClear={() => filter.clearFilters()}
    >
      <FilterField label="Country">
        <FilterRow>
          <Combobox<string | undefined>
            className="h-10 w-full"
            items={countryFilter
              .map(({ key, friendlyName }: FilterItem) => ({
                value: key,
                name: friendlyName,
                icon: <CountryFlag code={key} size={12} />,
              }))
              // The top country is the country of the claimed player
              .sort((country: { value: string }) => {
                if (country.value === mainPlayer?.country) {
                  return -1;
                }
                return 1;
              })}
            value={filter.country}
            onValueChange={newCountry => {
              if (newCountry) {
                filter.setCountry(newCountry);
              }
            }}
            placeholder="Select country..."
          />

          <SimpleTooltip display="Set as Default">
            <Button
              variant="outline"
              className="h-10 w-10 shrink-0"
              size="icon"
              onClick={() => {
                if (!filter.country) {
                  toast.error("Please select a country");
                  return;
                }
                database.setSetting(SettingIds.DefaultLeaderboardCountry, filter.country);
                toast.success(
                  `Set ${countryFilter.find(c => c.key === filter.country)?.friendlyName} as default`
                );
              }}
            >
              <FaCheck className="h-4 w-4" />
            </Button>
          </SimpleTooltip>
        </FilterRow>
      </FilterField>

      <div className="flex gap-2 pt-2">
        <div className="w-full">
          <SimpleTooltip display="Clear all current filters">
            <Button onClick={() => filter.clearFilters()} className="w-full" variant="outline">
              Clear Filters
            </Button>
          </SimpleTooltip>
        </div>
        <div className="w-full">
          <SimpleTooltip display="Reset all filters and clear default country">
            <Button variant="outline" onClick={() => filter.resetFilters()} className="w-full">
              Reset Default
            </Button>
          </SimpleTooltip>
        </div>
      </div>
    </FilterSection>
  );
}
