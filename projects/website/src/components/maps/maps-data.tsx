"use client";

import { Button } from "@/components/ui/button";
import Leaderboards from "@/components/maps/category/leaderboards";
import Playlists from "@/components/maps/playlist/playlists";
import MapFilters from "@/components/maps/map-filters";
import { MapFilterProvider } from "@/components/providers/maps/map-filter-provider";
import { ReactNode, useEffect, useState } from "react";
import RankingQueue from "@/components/maps/category/ranking-queue";
import usePageNavigation from "@/hooks/use-page-navigation";

type Category = {
  name: string;
  icon: string;
  id: string;
  showFilter: boolean;
  render: () => ReactNode;
};

const categories: Category[] = [
  {
    name: "Leaderboards",
    icon: "🏆",
    id: "leaderboards",
    showFilter: true,
    render: () => <Leaderboards />,
  },
  {
    name: "Ranking Queue",
    icon: "📈",
    id: "ranking-queue",
    showFilter: false,
    render: () => <RankingQueue />,
  },
];

type MapsDataProps = {
  /**
   * The selected category.
   */
  category?: string;
};

export function MapsData({ category }: MapsDataProps) {
  const defaultCategory = categories[0];

  const pageNavigation = usePageNavigation();
  const [selectedCategory, setSelectedCategory] = useState(categories.find(c => c.id === category) || categories[0]);

  useEffect(() => {
    if (selectedCategory.id === defaultCategory.id) {
      pageNavigation.navigateToPage(`/maps`);
      return;
    }

    pageNavigation.navigateToPage(`/maps?category=${selectedCategory.id}`);
  }, [category, defaultCategory.id, pageNavigation, selectedCategory.id]);

  return (
    <MapFilterProvider>
      <div className="flex flex-col-reverse gap-2 w-full items-center xl:items-start xl:justify-center xl:flex-row">
        <article className="w-full 2xl:w-[800px] flex flex-col gap-2">
          <div className="flex gap-2 w-full">
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
                  <span className="text-2xl">{category.icon}</span>
                  <span>{category.name}</span>
                </span>
              </Button>
            ))}
          </div>

          {/* Category Render */}
          {selectedCategory.render()}
        </article>
        <div className="w-full xl:w-[400px] flex flex-col gap-2">
          <Playlists />
          {selectedCategory.showFilter && <MapFilters />}
        </div>
      </div>
    </MapFilterProvider>
  );
}
