"use client";

import Card from "@/components/card";
import CountryFlag from "@/components/country-flag";
import { useLeaderboardFilter } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import { Button } from "@/components/ui/button";
import Combobox from "@/components/ui/combo-box";
import useDatabase from "@/hooks/use-database";
import { getCountries } from "@ssr/common/utils/country.util";
import { useLiveQuery } from "dexie-react-hooks";

export default function LeaderboardFilters() {
  const database = useDatabase();
  const mainPlayer = useLiveQuery(() => database.getMainPlayer());

  const filter = useLeaderboardFilter();

  return (
    <Card className="w-full h-fit text-sm flex gap-2">
      <p className="text-md font-bold text-center">Search Filters</p>

      <Combobox<string | undefined>
        name="Country"
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

      <Button onClick={() => filter.clearFilters()}>Clear Filters</Button>
    </Card>
  );
}
