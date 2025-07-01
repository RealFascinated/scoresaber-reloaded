"use client";

import Friend from "@/components/friend/friend";
import { useSearch } from "@/components/providers/search-provider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
import { PersonIcon } from "@radix-ui/react-icons";
import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";
import NavbarButton from "../navbar/navbar-button";

export default function FriendsButton() {
  const database = useDatabase();
  const friends = useLiveQuery(() => database.getFriends());
  const isMobile: boolean = useIsMobile();
  const { openSearch } = useSearch();

  const [open, setOpen] = useState<boolean>(false);
  const closeTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (isMobile) {
      return;
    }
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
    }
    setOpen(true);
  };

  const handleMouseLeave = () => {
    if (isMobile) {
      return;
    }
    closeTimeout.current = setTimeout(() => setOpen(false), 200); // Adjust delay as needed
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="h-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <NavbarButton className="px-0">
          <PersonIcon className="text-muted-foreground size-5" />
          <span className="text-muted-foreground hidden xl:flex">Friends</span>
        </NavbarButton>
      </PopoverTrigger>
      <PopoverContent
        className="mt-2.5 max-h-[400px] w-screen overflow-hidden overflow-y-auto p-2 text-sm select-none md:w-[350px]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {friends && friends.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {friends
              .sort((a, b) => {
                // Sort inactive friends to the bottom
                if (a.inactive && !b.inactive) return 1;
                if (!a.inactive && b.inactive) return -1;

                // Sort by rank
                return a.rank - b.rank;
              })
              .map((friend, index) => (
                <Friend player={friend} key={index} onClick={() => setOpen(false)} />
              ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-sm">
            <p className="pointer-events-none">You don&#39;t have any friends :(</p>
            <Button
              size="sm"
              onClick={() => {
                setOpen(false);
                openSearch();
              }}
            >
              Search Player
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
