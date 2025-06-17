"use client";

import Leaderboards from "@/components/maps/category/leaderboards";
import RankingQueue from "@/components/maps/category/ranking-queue";
import MapFilters from "@/components/maps/map-filters";
import Playlists from "@/components/maps/playlist/playlists";
import { MapFilterProvider } from "@/components/providers/maps/map-filter-provider";
import SimpleTooltip from "@/components/simple-tooltip";
import { Button } from "@/components/ui/button";
import usePageNavigation from "@/hooks/use-page-navigation";
import { TrophyIcon } from "@heroicons/react/24/solid";
import { ExternalLinkIcon, TrendingUpIcon } from "lucide-react";
import { ElementType, ReactNode, useEffect, useState } from "react";

type Category = {
  name: string;
  icon: ElementType;
  id: string;
  showFilter: boolean;
  preservePage?: boolean;
  externalLink?: string;
  render: (page?: number) => ReactNode;
};

const categories: Category[] = [
  {
    name: "Leaderboards",
    icon: TrophyIcon,
    id: "leaderboards",
    showFilter: true,
    preservePage: true,
    render: (page?: number) => <Leaderboards initialPage={page} />,
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
  category?: string;

  /**
   * The selected page.
   */
  page?: number;
};

export function MapsData({ category, page }: MapsDataProps) {
  const defaultCategory = categories[0];

  const pageNavigation = usePageNavigation();
  const [selectedCategory, setSelectedCategory] = useState(
    categories.find(c => c.id === category) || categories[0]
  );

  useEffect(() => {
    const path = `/maps?category=${selectedCategory.id}`;

    pageNavigation.changePageUrl(
      `${path}${page && page !== 1 ? (path.includes("?") ? "&" : "?") + `page=${page}` : ""}`
    );
  }, [
    category,
    defaultCategory.id,
    page,
    pageNavigation,
    selectedCategory.id,
    selectedCategory.preservePage,
  ]);

  return (
    <MapFilterProvider>
      <div className="flex w-full flex-col-reverse items-center gap-2 xl:flex-row xl:items-start xl:justify-center">
        <article className="flex w-full flex-col gap-2 2xl:w-[800px]">
          <div className="flex w-full gap-2">
            {categories.map(category => (
              <Button
                key={category.name}
                className="w-full"
                variant={category.name == selectedCategory.name ? "default" : "secondary"}
                onClick={() => {
                  setSelectedCategory(category);
                }}
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
            ))}
          </div>

          {/* Category Render */}
          {selectedCategory.render(page)}
        </article>
        <div className="flex w-full flex-col gap-2 xl:w-[400px]">
          <Playlists />
          {selectedCategory.showFilter && <MapFilters />}
        </div>
      </div>
    </MapFilterProvider>
  );
}
