"use client";

import Combobox from "@/components/ui/combo-box";
import Card from "@/components/card";
import { useLiveQuery } from "dexie-react-hooks";
import useDatabase from "@/hooks/use-database";
import { useLeaderboardFilter } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import { Button } from "@/components/ui/button";
import { getCountries } from "@ssr/common/utils/country.util";

export default function LeaderboardFilters() {
  const database = useDatabase();
  const claimedPlayer = useLiveQuery(() => database.getClaimedPlayer());

  const filter = useLeaderboardFilter();

  return (
    <Card className="w-full h-fit text-sm flex gap-2">
      <p className="text-md font-bold text-center">Search Filters</p>

      <Combobox<string | undefined>
        name="Country"
        items={getCountries()
          .map(({ code, name }) => ({ value: code, name: name }))
          // The top country is the country of the claimed player
          .sort(country => {
            if (country.value === claimedPlayer?.country) {
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

      <Button onClick={() => filter.clearFilters()}>Clear Filters</Button>
    </Card>
  );
}
