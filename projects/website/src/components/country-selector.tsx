"use client";

import { countryFilter } from "@ssr/common/utils/country.util";
import { pluralize } from "@ssr/common/utils/string.util";
import Combobox from "./ui/combo-box";
import CountryFlag from "./ui/country-flag";

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

export default function CountrySelector({
  value,
  onValueChange,
  className,
  clearable,
  placeholder,
  prioritizeCountry,
  counts,
  countNoun = "player",
}: CountrySelectorProps) {
  const hasCounts = counts != undefined;

  return (
    <Combobox<string | undefined>
      className={className}
      clearable={clearable}
      items={countryFilter
        .map(country => {
          const count = counts?.[country.key];

          return {
            value: country.key,
            name: (
              <div className="flex w-full min-w-0 items-center justify-between">
                <span className="truncate">{country.friendlyName}</span>
                {hasCounts && count != undefined && (
                  <span className="text-muted-foreground ml-4 text-sm whitespace-nowrap">
                    {count.toLocaleString()} {pluralize(count, countNoun)}
                  </span>
                )}
              </div>
            ),
            displayName: country.friendlyName,
            icon: <CountryFlag code={country.key} size={12} />,
          };
        })
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
