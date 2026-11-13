"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDownIcon } from "lucide-react";

type PlayerNameHistoryProps = {
  previousNames: string[];
};

export default function PlayerNameHistory({ previousNames }: PlayerNameHistoryProps) {
  if (previousNames.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Previous names"
          className="text-muted-foreground hover:text-foreground focus-visible:outline-primary/50 cursor-pointer rounded-sm p-0.5 transition-colors focus-visible:outline-2"
        >
          <ChevronDownIcon className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-auto max-w-72 min-w-48 flex-col gap-2">
        <p className="text-muted-foreground text-sm">Previous Names</p>
        <ul className="flex flex-col gap-1">
          {previousNames.map(name => (
            <li key={name} className="text-foreground truncate text-base">
              {name}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
