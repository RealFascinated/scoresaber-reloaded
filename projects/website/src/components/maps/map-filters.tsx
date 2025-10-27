"use client";

import Card from "@/components/card";
import { useMapFilter } from "@/components/providers/maps/map-filter-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Consts } from "@ssr/common/consts";
import { MapCategory, MapSort } from "@ssr/common/maps/types";
import { Input } from "../ui/input";

export default function MapFilters() {
  const filter = useMapFilter();

  return (
    <Card className="flex h-fit w-full gap-2 text-sm">
      <p className="text-md text-center font-bold">Search Filters</p>

      <div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={filter.ranked}
            onCheckedChange={checked => {
              filter.setRanked(checked as boolean);
            }}
          />
          <h1 className="text-sm">Ranked Maps</h1>
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
      </div>

      <div className="flex flex-col gap-2">
        {/* Search */}
        <div className="flex flex-col gap-1">
          <h1 className="text-sm font-bold">Search</h1>
          <Input
            value={filter.search}
            onChange={e => filter.setSearch(e.target.value)}
            placeholder="Search for a map"
          />
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1">
          <h1 className="text-sm font-bold">Category</h1>
          <Select
            value={filter.category !== undefined ? String(filter.category) : undefined}
            onValueChange={newCategory => {
              if (newCategory) {
                filter.setCategory(Number(newCategory));
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(MapCategory.Trending)}>Trending</SelectItem>
              <SelectItem value={String(MapCategory.DateRanked)}>Date Ranked</SelectItem>
              <SelectItem value={String(MapCategory.ScoresSet)}>Scores Set</SelectItem>
              <SelectItem value={String(MapCategory.StarDifficulty)}>Star Difficulty</SelectItem>
              <SelectItem value={String(MapCategory.Author)}>Author</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div>
          <h1 className="text-sm font-bold">Sort</h1>
          <Select
            value={String(filter.sort)}
            onValueChange={newSort => {
              if (newSort) {
                filter.setSort(Number(newSort));
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(MapSort.Ascending)}>Ascending</SelectItem>
              <SelectItem value={String(MapSort.Descending)}>Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Min/Max Stars */}
      <div>
        <h1 className="text-sm font-bold">Stars</h1>
        <DualRangeSlider
          label={value => <span>{value}</span>}
          value={[filter.starMin ?? 0, filter.starMax ?? Consts.MAX_STARS]}
          onValueChange={value => {
            filter.setStarMin(value[0]);
            filter.setStarMax(value[1]);
          }}
          min={0}
          max={Consts.MAX_STARS}
          step={0.1}
          className="pb-2 pt-10"
        />
      </div>

      {/* Clear filters */}
      <Button onClick={() => filter.clearFilters()}>Clear Filters</Button>
    </Card>
  );
}
