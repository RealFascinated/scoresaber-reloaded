"use client";

import { useSearch } from "@/components/providers/search-provider";
import { Button } from "@/components/ui/button";
import { SharedIcons } from "@/shared-icons";

export function SearchButton() {
  const { openSearch } = useSearch();

  return (
    <Button
      onClick={openSearch}
      className="flex h-12 w-full max-w-sm items-center justify-between gap-3 rounded-xl bg-card px-4 text-left ring-1 ring-border transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-3">
        <SharedIcons.SearchIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Search players...</span>
      </div>
      <kbd className="hidden rounded-md border bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground sm:inline-block">
        Ctrl+K
      </kbd>
    </Button>
  );
}
