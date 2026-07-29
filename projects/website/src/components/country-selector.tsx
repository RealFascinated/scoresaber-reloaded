"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CountryFlag from "@/components/ui/country-flag";
import { countryFilter } from "@ssr/common/utils/country.util";
import { pluralize } from "@ssr/common/utils/string.util";

type CountrySelectorProps = {
  value?: string;
  onValueChange: (value: string | undefined) => void;
  className?: string;
  clearable?: boolean;
  placeholder?: string;
  prioritizeCountry?: string;
  counts?: Record<string, number>;
  countNoun?: string;
};

const CLEAR_VALUE = "__clear__";

export default function CountrySelector({
  value,
  onValueChange,
  className,
  clearable,
  placeholder = "All countries",
  prioritizeCountry,
  counts,
  countNoun = "player",
}: CountrySelectorProps) {
  const hasCounts = counts != undefined;

  const items = countryFilter
    .map(country => {
      const count = counts?.[country.key];
      return {
        value: country.key,
        name: country.friendlyName,
        count,
      };
    })
    .sort((a, b) => {
      if (prioritizeCountry && a.value === prioritizeCountry) return -1;
      if (prioritizeCountry && b.value === prioritizeCountry) return 1;
      return 0;
    });

  return (
    <Select
      value={value ?? CLEAR_VALUE}
      onValueChange={val => onValueChange(val === CLEAR_VALUE ? undefined : val)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {value ? (
            <div className="flex items-center gap-2">
              <CountryFlag code={value} size={12} />
              <span>{countryFilter.find(c => c.key === value)?.friendlyName ?? value}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {clearable && (
          <SelectItem value={CLEAR_VALUE}>
            <span className="text-muted-foreground">{placeholder}</span>
          </SelectItem>
        )}
        {items.map(item => (
          <SelectItem key={item.value} value={item.value}>
            <div className="flex w-full min-w-0 items-center justify-between gap-2">
              <span className="flex items-center gap-2 truncate">
                <CountryFlag code={item.value} size={12} />
                <span className="truncate">{item.name}</span>
              </span>
              {hasCounts && item.count != undefined && (
                <span className="text-muted-foreground ml-4 text-sm whitespace-nowrap tabular-nums">
                  {item.count.toLocaleString()} {pluralize(item.count, countNoun)}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
