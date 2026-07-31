"use client";

import { cn } from "@/common/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import CountryFlag from "@/components/ui/country-flag";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SharedIcons } from "@/shared-icons";
import { countryFilter } from "@ssr/common/utils/country.util";
import { pluralize } from "@ssr/common/utils/string.util";
import { useId, useState } from "react";

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
const UNKNOWN_FLAG_SRC = "/assets/flags/unknown.png";

/**
 * Lightweight flag for dropdown rows. The full `CountryFlag` renders a Radix tooltip
 * stack + `next/image`, which is far too heavy for the ~250 rows mounted at once when
 * the dropdown opens. Dropdown rows only need the image.
 */
function CountryFlagImage({ code, size }: { code: string; size: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{ width: size * 2, minWidth: size * 2 }}
    >
      <img
        src={code ? `/assets/flags/${code.toLowerCase()}.png` : UNKNOWN_FLAG_SRC}
        alt=""
        width={size * 2}
        height={size * 2}
        loading="lazy"
        decoding="async"
        className="object-contain"
        style={{ width: size * 2, height: size * 2 }}
        onError={e => {
          const img = e.currentTarget;
          if (!img.src.endsWith("/unknown.png")) {
            img.src = UNKNOWN_FLAG_SRC;
          }
        }}
      />
    </div>
  );
}

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
  const [open, setOpen] = useState(false);
  const listId = useId();
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
      if (prioritizeCountry && a.value === prioritizeCountry) {
        return -1;
      }
      if (prioritizeCountry && b.value === prioritizeCountry) {
        return 1;
      }
      return 0;
    });

  const selected = value ? countryFilter.find(c => c.key === value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          className={cn(
            "border-border ring-offset-background placeholder:text-muted-foreground focus:ring-ring hover:border-primary/50 bg-muted flex h-9 w-full cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm whitespace-nowrap transition-colors duration-200 focus:ring-1 focus:outline-hidden",
            open && "border-primary/50",
            className
          )}
        >
          {value ? (
            <span className="flex min-w-0 items-center gap-2">
              <CountryFlag code={value} size={12} />
              <span className="truncate">{selected?.friendlyName ?? value}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <SharedIcons.ComboBoxToggleIcon className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) rounded-md p-0" align="start">
        <Command>
          <CommandInput placeholder="Search countries..." autoFocus />
          <CommandList id={listId} className="max-h-96">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {clearable && (
                <CommandItem
                  value={CLEAR_VALUE}
                  onSelect={() => {
                    setOpen(false);
                    onValueChange(undefined);
                  }}
                  className={cn("justify-between", !value && "bg-accent text-accent-foreground")}
                >
                  <span className="text-muted-foreground">{placeholder}</span>
                  {!value && <SharedIcons.SelectCheckIcon className="h-4 w-4" />}
                </CommandItem>
              )}
              {items.map(item => (
                <CommandItem
                  key={item.value}
                  value={item.name}
                  onSelect={() => {
                    setOpen(false);
                    onValueChange(item.value);
                  }}
                  className="flex w-full min-w-0 items-center justify-between gap-2"
                >
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    <CountryFlagImage code={item.value} size={12} />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {hasCounts && item.count != undefined && (
                      <span className="text-muted-foreground text-sm whitespace-nowrap tabular-nums">
                        {item.count.toLocaleString()} {pluralize(item.count, countNoun)}
                      </span>
                    )}
                    {item.value === value && <SharedIcons.SelectCheckIcon className="h-4 w-4" />}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
