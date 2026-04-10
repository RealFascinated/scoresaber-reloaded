"use client";

import { countryFilter } from "@ssr/common/utils/country.util";
import { pluralize } from "@ssr/common/utils/string.util";
import Combobox from "./ui/combo-box";
import CountryFlag from "./ui/country-flag";

type CountryCountsComboboxProps = {
  counts: Record<string, number>;
  value?: string;
  onValueChange: (value: string | undefined) => void;
  className?: string;
  clearable?: boolean;
  placeholder?: string;
  prioritizeCountry?: string;
  countNoun?: string;
};

export default function CountryCountsCombobox({
  counts,
  value,
  onValueChange,
  className,
  clearable,
  placeholder,
  prioritizeCountry,
  countNoun = "player",
}: CountryCountsComboboxProps) {
  return (
    <Combobox<string | undefined>
      className={className}
      clearable={clearable}
      items={Object.entries(counts)
        .map(([key, count]) => ({
          value: key,
          name: (
            <div className="flex w-full min-w-0 items-center justify-between">
              <span className="truncate">{countryFilter.find(c => c.key === key)?.friendlyName ?? key}</span>
              <span className="text-muted-foreground ml-4 text-sm whitespace-nowrap">
                {count.toLocaleString()} {pluralize(count, countNoun)}
              </span>
            </div>
          ),
          displayName: countryFilter.find(c => c.key === key)?.friendlyName ?? key,
          icon: <CountryFlag code={key} size={12} />,
        }))
        .sort((a, b) => {
          if (prioritizeCountry && a.value === prioritizeCountry) {
            return -1;
          }
          if (prioritizeCountry && b.value === prioritizeCountry) {
            return 1;
          }
          return 0;
        })}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
    />
  );
}
