"use client";

import Leaderboards from "@/components/maps/category/leaderboards";
import RankingQueue from "@/components/maps/category/ranking-queue";
import MapFilters from "@/components/maps/map-filters";
import Playlists from "@/components/maps/playlist/playlists";
import { MapFilterProvider } from "@/components/providers/maps/map-filter-provider";
import SimpleLink from "@/components/simple-link";
import SimpleTooltip from "@/components/simple-tooltip";
import { Button } from "@/components/ui/button";
import { TrophyIcon } from "@heroicons/react/24/solid";
import { ExternalLinkIcon, TrendingUpIcon } from "lucide-react";
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
    icon: TrophyIcon,
    id: "leaderboards",
    showFilter: true,
    preservePage: true,
    render: () => <Leaderboards />,
  },
  {
    name: "Ranking Queue",
    icon: TrendingUpIcon,
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
      <div className="flex w-full flex-col-reverse items-center gap-2 xl:flex-row xl:items-start xl:justify-center">
        <article className="flex w-full flex-col gap-2 2xl:w-[800px]">
          <div className="flex w-full gap-2 flex-col md:flex-row">
            {categories.map(category => (
              <SimpleLink href={`/maps/${category.id}`} key={category.name} className="w-full">
                <Button
                  className="w-full"
                  variant={category.name == selectedCategory.name ? "default" : "secondary"}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-2xl">
                      <category.icon className="h-4 w-4" />
                    </span>
                    <span>{category.name}</span>
                  </span>
                </Button>
              </SimpleLink>
            ))}
          </div>

          {/* Category Render */}
          {selectedCategory.render()}
        </article>
        <div className="flex w-full flex-col gap-2 xl:w-[430px]">
          {/* Playlists */}
          <Playlists />

          {/* External Links */}
          <Card>
            <SimpleTooltip
              display={<p>Click to open the Ranking Queue on ScoreSaber</p>}
              side="bottom"
            >
              <SimpleLink
                href="https://scoresaber.com/ranking/requests"
                target="_blank"
                className="w-full"
              >
                <Button className="flex w-full items-center justify-center gap-2">
                  <ExternalLinkIcon className="h-4 w-4" />
                  <span>ScoreSaber Ranking Queue</span>
                </Button>
              </SimpleLink>
            </SimpleTooltip>
          </Card>

          {/* Map Filters */}
          {selectedCategory.showFilter && <MapFilters />}
        </div>
      </div>
    </MapFilterProvider>
  );
}
