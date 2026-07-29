"use client";

import { useSearch } from "@/components/providers/search-provider";
import { Button } from "@/components/ui/button";
import { SharedIcons } from "@/shared-icons";

export function SearchButton() {
  const { openSearch } = useSearch();

  return (
    <Button
      onClick={openSearch}
      className="ring-border bg-card hover:bg-accent flex h-12 w-full max-w-sm items-center justify-between gap-3 rounded-xl px-4 text-left ring-1 transition-colors"
    >
      <div className="flex items-center gap-3">
        <SharedIcons.SearchIcon className="text-muted-foreground h-4 w-4" />
        <span className="text-muted-foreground text-sm">Search players...</span>
      </div>
      <kbd className="bg-muted text-muted-foreground hidden rounded-md border px-1.5 py-0.5 text-xs font-medium sm:inline-block">
        Ctrl+K
      </kbd>
    </Button>
  );
}
