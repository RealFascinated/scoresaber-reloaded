"use client";

import Card from "@/components/card";
import { useMapFilter } from "@/components/providers/maps/map-filter-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Combobox from "@/components/ui/combo-box";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { MapCategory, MapSort } from "@ssr/common/maps/types";

export default function MapFilters() {
  const filter = useMapFilter();

  return (
    <Card className="flex h-fit w-full gap-2 text-sm">
      <p className="text-md text-center font-bold">Search Filters</p>

      <div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={filter.verified}
            onCheckedChange={checked => {
              filter.setVerified(checked as boolean);
            }}
          />
          <h1 className="text-sm">Verified Maps</h1>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={filter.qualified}
            onCheckedChange={checked => {
              filter.setQualified(checked as boolean);
            }}
          />
          <h1 className="text-sm">Qualified Maps</h1>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={filter.ranked}
            onCheckedChange={checked => {
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
            { value: String(MapCategory.Trending), name: "Trending" },
            { value: String(MapCategory.DateRanked), name: "Date Ranked" },
            { value: String(MapCategory.ScoresSet), name: "Scores Set" },
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
        <DualRangeSlider
          label={value => <span>{value}</span>}
          value={[filter.stars?.min ?? 0, filter.stars?.max ?? 15]}
          onValueChange={value => {
            filter.setStars({ min: value[0], max: value[1] });
          }}
          min={0}
          max={15}
          step={0.1}
          className="pt-10 pb-2"
        />
      </div>

      {/* Clear filters */}
      <Button onClick={() => filter.clearFilters()}>Clear Filters</Button>
    </Card>
  );
}
