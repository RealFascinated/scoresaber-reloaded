"use client";

import { useMapFilter } from "@/components/providers/maps/map-filter-provider";
import { Checkbox } from "@/components/ui/checkbox";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { FilterField, FilterSection } from "@/components/ui/filter-section";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { MapCategory, MapSort } from "@ssr/common/maps/types";
import { Input } from "../ui/input";

export default function MapFilters() {
  const filter = useMapFilter();

  const hasActiveFilters =
    filter.ranked ||
    filter.qualified ||
    filter.search.length > 0 ||
    filter.category !== undefined ||
    filter.starMin !== undefined ||
    filter.starMax !== SHARED_CONSTS.maxStars;

  return (
    <FilterSection
      title="Search Filters"
      description="Filter maps by various criteria"
      hasActiveFilters={hasActiveFilters}
      onClear={() => filter.clearFilters()}
    >
      {/* Status Filters */}
      <FilterField>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="ranked-maps"
              checked={filter.ranked}
              onCheckedChange={checked => {
                filter.setRanked(checked as boolean);
              }}
            />
            <label htmlFor="ranked-maps" className="cursor-pointer text-sm font-medium">
              Ranked Maps
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="qualified-maps"
              checked={filter.qualified}
              onCheckedChange={checked => {
                filter.setQualified(checked as boolean);
              }}
            />
            <label htmlFor="qualified-maps" className="cursor-pointer text-sm font-medium">
              Qualified Maps
            </label>
          </div>
        </div>
      </FilterField>

      {/* Search */}
      <FilterField label="Search">
        <Input
          value={filter.search}
          onChange={e => filter.setSearch(e.target.value)}
          placeholder="Search for a map..."
          className="h-10"
        />
      </FilterField>

      {/* Category */}
      <FilterField label="Category">
        <Select
          value={filter.category !== undefined ? String(filter.category) : undefined}
          onValueChange={newCategory => {
            if (newCategory) {
              filter.setCategory(Number(newCategory));
            }
          }}
        >
          <SelectTrigger className="h-10">
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
      </FilterField>

      {/* Sort */}
      <FilterField label="Sort">
        <Select
          value={String(filter.sort)}
          onValueChange={newSort => {
            if (newSort) {
              filter.setSort(Number(newSort));
            }
          }}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Select sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={String(MapSort.Ascending)}>Ascending</SelectItem>
            <SelectItem value={String(MapSort.Descending)}>Descending</SelectItem>
          </SelectContent>
        </Select>
      </FilterField>

      {/* Star Range */}
      <FilterField label="Star Range">
        <DualRangeSlider
          label={value => <span className="text-xs">{value}</span>}
          value={[filter.starMin ?? 0, filter.starMax ?? SHARED_CONSTS.maxStars]}
          onValueChange={value => {
            filter.setStarMin(value[0]);
            filter.setStarMax(value[1]);
          }}
          min={0}
          max={SHARED_CONSTS.maxStars}
          step={0.1}
          showLabelOnHover={false}
          className="pt-10 pb-2"
        />
      </FilterField>
    </FilterSection>
  );
}
