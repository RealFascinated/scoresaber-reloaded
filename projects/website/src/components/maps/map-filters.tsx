"use client";

import Combobox from "@/components/ui/combo-box";
import Card from "@/components/card";
import { Button } from "@/components/ui/button";
import { useMapFilter } from "@/components/providers/maps/map-filter-provider";
import { MapCategory, MapSort } from "@ssr/common/maps/types";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import React from "react";
import {Checkbox} from "@/components/ui/checkbox";

export default function MapFilters() {
  const filter = useMapFilter();

  return (
    <Card className="w-full h-fit text-sm flex gap-2">
      <p className="text-md font-bold text-center">Search Filters</p>

      <div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={filter.verified}
            onCheckedChange={(checked) => {
              filter.setVerified(checked as boolean);
            }}
          />
          <h1 className="text-sm">Verified Maps</h1>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={filter.qualified}
            onCheckedChange={(checked) => {
              filter.setQualified(checked as boolean);
            }}
          />
          <h1 className="text-sm">Qualified Maps</h1>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={filter.ranked}
            onCheckedChange={(checked) => {
              filter.setRanked(checked as boolean);
            }}
          />
          <h1 className="text-sm">Ranked Maps</h1>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {/* Category */}
        <Combobox<string>
          name="Category"
          items={[
            {value: String(MapCategory.Trending), name: "Trending"},
            {value: String(MapCategory.DateRanked), name: "Date Ranked"},
            {value: String(MapCategory.ScoresSet), name: "Scores Set" },
            { value: String(MapCategory.StarDifficulty), name: "Star Difficulty" },
            { value: String(MapCategory.Author), name: "Author" },
          ]}
          value={filter.category !== undefined ? String(filter.category) : undefined}
          onValueChange={newCategory => {
            if (newCategory) {
              filter.setCategory(Number(newCategory));
            }
          }}
        />

        {/* Sort */}
        <Combobox<string>
          name="Sort"
          items={[
            { value: String(MapSort.Ascending), name: "Ascending" },
            { value: String(MapSort.Descending), name: "Descending" },
          ]}
          value={String(filter.sort)}
          onValueChange={newSort => {
            if (newSort) {
              filter.setSort(Number(newSort));
            }
          }}
        />
      </div>

      {/* Min/Max Stars */}
      <div>
        <h1 className="text-sm font-bold">Stars</h1>
        <div className="pt-9 pb-2">
          <DualRangeSlider
            label={value => <span>{value}</span>}
            value={[filter.stars?.min ?? 0, filter.stars?.max ?? 15]}
            onValueChange={value => {
              filter.setStars({ min: value[0], max: value[1] });
            }}
            min={0}
            max={15}
            step={0.1}
          />
        </div>
      </div>

      {/* Clear filters */}
      <Button onClick={() => filter.clearFilters()}>Clear Filters</Button>
    </Card>
  );
}
