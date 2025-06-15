"use client";

import { SettingIds } from "@/common/database/database";
import Card from "@/components/card";
import CountryFlag from "@/components/country-flag";
import { useLeaderboardFilter } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import SimpleTooltip from "@/components/simple-tooltip";
import { Button } from "@/components/ui/button";
import Combobox from "@/components/ui/combo-box";
import useDatabase from "@/hooks/use-database";
import { getCountries } from "@ssr/common/utils/country.util";
import { useLiveQuery } from "dexie-react-hooks";
import { FaCheck } from "react-icons/fa";

export default function ScoreSaberLeaderboardFilters() {
  const database = useDatabase();
  const mainPlayer = useLiveQuery(() => database.getMainPlayer());

  const filter = useLeaderboardFilter();

  return (
    <Card className="w-full h-fit text-sm flex flex-col gap-2">
      <div className="flex gap-2 flex-row items-end">
        <Combobox<string | undefined>
          name="Country"
          className="w-full"
          items={getCountries()
            .map(({ code, name }) => ({
              value: code,
              name: name,
              icon: <CountryFlag code={code} size={12} />,
            }))
            // The top country is the country of the claimed player
            .sort(country => {
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
              if (mainPlayer) {
                database.setSetting(SettingIds.DefaultLeaderboardCountry, mainPlayer.country);
              }
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
