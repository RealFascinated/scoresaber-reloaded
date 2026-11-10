"use client";

import type { TimestampedData } from "@/common/server-prefetch";
import Leaderboards from "@/components/maps/category/leaderboards";
import RankingQueue from "@/components/maps/category/ranking-queue";
import MapFilters from "@/components/maps/map-filters";
import Playlists from "@/components/maps/playlist/playlists";
import { PageTitle } from "@/components/page-title";
import { MapFilterProvider } from "@/components/providers/maps/map-filter-provider";
import SimpleLink from "@/components/simple-link";
import { Button } from "@/components/ui/button";
import { SharedIcons } from "@/shared-icons";
import { RankingQueueLeaderboardsResponse } from "@ssr/common/schemas/response/leaderboard/ranking-queue-leaderboards";
import { ElementType, ReactNode } from "react";
import { MapsInitialData } from "./maps-query";

/** Data fetched on the server for the selected category. */
type MapsInitialDataProps = {
  initialMaps?: MapsInitialData;
  initialRankingQueue?: TimestampedData<RankingQueueLeaderboardsResponse>;
};

type Category = {
  name: string;
  description: string;
  icon: ElementType;
  id: string;
  showFilter: boolean;
  preservePage?: boolean;
  render: (initial: MapsInitialDataProps) => ReactNode;
};

const categories: Category[] = [
  {
    name: "Leaderboards",
    description: "Browse and filter ScoreSaber leaderboards",
    icon: SharedIcons.MapsLeaderboardsTabIcon,
    id: "leaderboards",
    showFilter: true,
    preservePage: true,
    render: ({ initialMaps }) => <Leaderboards initial={initialMaps} />,
  },
  {
    name: "Ranking Queue",
    description: "Maps currently up for rank or unrank on ScoreSaber",
    icon: SharedIcons.MapsRankingQueueTabIcon,
    id: "ranking-queue",
    showFilter: false,
    render: ({ initialRankingQueue }) => <RankingQueue initial={initialRankingQueue} />,
  },
];

type MapsDataProps = MapsInitialDataProps & {
  type?: string;
};

export function MapsData({ type, initialMaps, initialRankingQueue }: MapsDataProps) {
  const selectedCategory = categories.find(c => c.id === type) || categories[0];

  return (
    <MapFilterProvider>
      <div className="flex w-full flex-col gap-4">
        <PageTitle
          title={selectedCategory.name}
          description={selectedCategory.description}
          actions={
            <>
              {selectedCategory.id === "ranking-queue" && (
                <SimpleLink href="https://scoresaber.com/ranking/requests" target="_blank">
                  <Button variant="outline" size="sm" className="gap-2">
                    <SharedIcons.MapsExternalLinkIcon className="size-4" />
                    Open on ScoreSaber
                  </Button>
                </SimpleLink>
              )}
              <Playlists />
            </>
          }
        />
        <div className="flex w-full flex-col gap-4 xl:flex-row xl:gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {selectedCategory.render({ initialMaps, initialRankingQueue })}
          </div>
          {selectedCategory.showFilter && (
            <div className="flex w-full shrink-0 flex-col gap-4 xl:w-80">
              <MapFilters />
            </div>
          )}
        </div>
      </div>
    </MapFilterProvider>
  );
}
