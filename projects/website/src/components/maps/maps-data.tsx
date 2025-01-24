"use client";

import { Button } from "@/components/ui/button";
import Leaderboards from "@/components/maps/category/leaderboards";
import Playlists from "@/components/maps/playlist/playlists";
import MapFilters from "@/components/maps/map-filters";
import { MapFilterProvider } from "@/components/providers/maps/map-filter-provider";
import { ReactNode, useState } from "react";
import RankingQueue from "@/components/maps/category/ranking-queue";

type Category = {
  name: string;
  icon: string;
  link: string;
  showFilter: boolean;
  render: () => ReactNode;
};

const categories: Category[] = [
  {
    name: "Leaderboards",
    icon: "🏆",
    link: "/leaderboards",
    showFilter: true,
    render: () => <Leaderboards />,
  },
  {
    name: "Ranking Queue",
    icon: "📈",
    link: "/ranking-queue",
    showFilter: false,
    render: () => <RankingQueue />,
  },
];

export function MapsData() {
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);

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
