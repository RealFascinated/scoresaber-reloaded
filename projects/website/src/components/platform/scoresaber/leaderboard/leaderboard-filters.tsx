"use client";

import { SettingIds } from "@/common/database/database";
import Card from "@/components/card";
import { useLeaderboardFilter } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import SimpleTooltip from "@/components/simple-tooltip";
import { Button } from "@/components/ui/button";
import Combobox from "@/components/ui/combo-box";
import CountryFlag from "@/components/ui/country-flag";
import useDatabase from "@/hooks/use-database";
import { FilterItem } from "@ssr/common/filter-item";
import { countryFilter } from "@ssr/common/utils/country.util";
import { useLiveQuery } from "dexie-react-hooks";
import { FaCheck } from "react-icons/fa";
import { toast } from "sonner";

export default function ScoreSaberLeaderboardFilters() {
  const database = useDatabase();
  const mainPlayer = useLiveQuery(() => database.getMainPlayer());

  const filter = useLeaderboardFilter();

  async function resetDefault() {
    filter.setCountry(undefined);
  }

  return (
    <Card className="flex h-fit w-full flex-col gap-2 text-sm 2xl:w-[405px]">
      <div className="flex flex-row items-end gap-2">
        <Combobox<string | undefined>
          name="Country"
          className="w-full"
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
        />

        <SimpleTooltip display="Set as Default">
          <Button
            variant="outline"
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
            <FaCheck />
          </Button>
        </SimpleTooltip>
      </div>

      <div className="flex gap-2">
        <div className="w-full">
          <SimpleTooltip display="Clear all current filters">
            <Button onClick={() => filter.clearFilters()} className="w-full">
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
    </Card>
  );
}
