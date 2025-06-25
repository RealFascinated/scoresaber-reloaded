"use client";

import Leaderboards from "@/components/maps/category/leaderboards";
import RankingQueue from "@/components/maps/category/ranking-queue";
import MapFilters from "@/components/maps/map-filters";
import Playlists from "@/components/maps/playlist/playlists";
import { MapFilterProvider } from "@/components/providers/maps/map-filter-provider";
import SimpleTooltip from "@/components/simple-tooltip";
import { Button } from "@/components/ui/button";
import { TrophyIcon } from "@heroicons/react/24/solid";
import { ExternalLinkIcon, TrendingUpIcon } from "lucide-react";
import Link from "next/link";
import { ElementType, ReactNode } from "react";

type Category = {
  name: string;
  icon: ElementType;
  id: string;
  showFilter: boolean;
  preservePage?: boolean;
  externalLink?: string;
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
    externalLink: "https://scoresaber.com/ranking/requests",
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
          <div className="flex w-full gap-2">
            {categories.map(category => (
              <Link href={`/maps/${category.id}`} key={category.name} className="w-full">
                <Button
                  className="w-full"
                  variant={category.name == selectedCategory.name ? "default" : "secondary"}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-2xl">
                      <category.icon className="h-4 w-4" />
                    </span>
                    <span>{category.name}</span>

                    {category.externalLink && (
                      <SimpleTooltip
                        display={<p>View {category.name} on ScoreSaber</p>}
                        side="bottom"
                      >
                        <div
                          className="flex cursor-pointer items-center gap-2 p-1"
                          onClick={() => {
                            window.open(category.externalLink, "_blank");
                          }}
                        >
                          <ExternalLinkIcon className="h-4 w-4" />
                        </div>
                      </SimpleTooltip>
                    )}
                  </span>
                </Button>
              </Link>
            ))}
          </div>

          {/* Category Render */}
          {selectedCategory.render()}
        </article>
        <div className="flex w-full flex-col gap-2 xl:w-[400px]">
          <Playlists />
          {selectedCategory.showFilter && <MapFilters />}
        </div>
      </div>
    </MapFilterProvider>
  );
}
