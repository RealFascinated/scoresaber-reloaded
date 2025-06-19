"use client";

import { useSearch } from "@/components/providers/search-provider";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export function SearchButton() {
  const { openSearch } = useSearch();

  return (
    <Button
      onClick={openSearch}
      size="lg"
      className="group from-primary relative h-12 overflow-hidden rounded-xl bg-gradient-to-r to-purple-600 px-8 text-white shadow-lg transition-all duration-300 hover:shadow-xl"
    >
      <div className="from-primary/20 absolute inset-0 bg-gradient-to-r to-purple-600/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <Search className="relative z-10 mr-2 h-5 w-5" />
      <span className="relative z-10 font-semibold">Find Players</span>
    </Button>
  );
}
