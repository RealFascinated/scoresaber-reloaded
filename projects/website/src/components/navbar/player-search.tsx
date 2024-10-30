"use client";

import { useEffect, useState } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/common/utils";

export default function PlayerSearch() {
  const [smallScreen, setSmallScreen] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = (): void => {
      setSmallScreen(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Listen for CTRL + K keybinds to open this dialog
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        setOpen((open: boolean) => !open);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Render the contents
  return (
    <>
      {/* Button to open */}
      <div
        className="flex cursor-pointer hover:opacity-85 transition-all transform-gpu select-none"
        onClick={() => setOpen(true)}
      >
        <div className={cn("absolute top-1.5 z-10", smallScreen ? "inset-x-0 flex justify-center" : "inset-x-2.5")}>
          <Search className="size-5" />
        </div>

        <Input
          className="px-0 pl-9 w-10 md:w-full h-8 rounded-lg cursor-pointer"
          type="search"
          name="search"
          placeholder={smallScreen ? undefined : "Query..."}
          readOnly
        />

        <div className={cn("hidden absolute top-1.5 right-3", !smallScreen && "flex")}>
          <kbd className="h-5 px-1.5 inline-flex gap-1 items-center bg-muted font-medium text-muted-foreground rounded select-none pointer-events-none">
            <span>⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        {/* Input */}
        <CommandInput className="select-none" placeholder="Start typing to get started..." />

        {/* Results */}
        <CommandList className="select-none">
          <CommandEmpty className="text-center text-red-500">No results were found.</CommandEmpty>

          <CommandGroup heading="Results">bob ross</CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
