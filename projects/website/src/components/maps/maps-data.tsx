"use client";

import Leaderboards from "@/components/maps/category/leaderboards";
import RankingQueue from "@/components/maps/category/ranking-queue";
import MapFilters from "@/components/maps/map-filters";
import Playlists from "@/components/maps/playlist/playlists";
import { MapFilterProvider } from "@/components/providers/maps/map-filter-provider";
import SimpleLink from "@/components/simple-link";
import SimpleTooltip from "@/components/simple-tooltip";
import { Button } from "@/components/ui/button";
import { SharedIcons } from "@/shared-icons";
import { ElementType, ReactNode } from "react";
import Card from "../card";

type Category = {
  name: string;
  icon: ElementType;
  id: string;
  showFilter: boolean;
  preservePage?: boolean;
  render: () => ReactNode;
};

const categories: Category[] = [
  {
    name: "Leaderboards",
    icon: SharedIcons.MapsLeaderboardsTabIcon,
    id: "leaderboards",
    showFilter: true,
    preservePage: true,
    render: () => <Leaderboards />,
  },
  {
    name: "Ranking Queue",
    icon: SharedIcons.MapsRankingQueueTabIcon,
    id: "ranking-queue",
    showFilter: false,
    render: () => <RankingQueue />,
  },
];

type MapsDataProps = {
  /**
   * The selected category.
   */
  type?: string;
};

export function MapsData({ type }: MapsDataProps) {
  const selectedCategory = categories.find(c => c.id === type) || categories[0];

  return (
    <MapFilterProvider>
      <div className="flex w-full flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {selectedCategory.render()}
        </div>
        <div className="flex w-full flex-col gap-4 lg:w-96 shrink-0">
          {selectedCategory.showFilter && <MapFilters />}
          {selectedCategory.id === "ranking-queue" && (
            <Card>
              <SimpleTooltip display={<p>Click to open the Ranking Queue on ScoreSaber</p>} side="bottom">
                <SimpleLink href="https://scoresaber.com/ranking/requests" target="_blank" className="w-full">
                  <Button className="flex w-full items-center justify-center gap-2">
                    <SharedIcons.MapsExternalLinkIcon className="h-4 w-4" />
                    <span>ScoreSaber Ranking Queue</span>
                  </Button>
                </SimpleLink>
              </SimpleTooltip>
            </Card>
          )}
          <Playlists />
        </div>
      </div>
    </MapFilterProvider>
  );
}
