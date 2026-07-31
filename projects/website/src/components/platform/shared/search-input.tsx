"use client";

import { cn } from "@/common/utils";
import { Input } from "@/components/ui/input";
import { SharedIcons } from "@/shared-icons";

export default function SearchInput({
  search,
  invalidSearch,
  onSearchChange,
}: {
  search: string | null;
  invalidSearch: boolean;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="relative w-full sm:w-auto">
      <SharedIcons.SearchFieldIcon className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
      <Input
        type="search"
        placeholder="Query..."
        className={cn("h-8 w-full pr-3 pl-8 text-xs sm:w-64", invalidSearch && "border-red-500")}
        value={search || ""}
        onChange={e => onSearchChange(e.target.value)}
      />
      {search && search.length > 0 && (
        <SharedIcons.ClearSearchInputIcon
          className="text-muted-foreground absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 cursor-pointer"
          onClick={() => onSearchChange("")}
        />
      )}
    </div>
  );
}
