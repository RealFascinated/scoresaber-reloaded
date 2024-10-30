"use client";

import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import NavbarButton from "./navbar-button";
import { PersonIcon } from "@radix-ui/react-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Friend from "@/components/friend/friend";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-is-mobile";

export default function FriendsButton() {
  const isMobile: boolean = useIsMobile();

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

  const database = useDatabase();
  const friends = useLiveQuery(() => database.getFriends());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="h-full" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <NavbarButton>
          <PersonIcon className="size-6" />
          <span className="hidden sm:flex">Friends</span>
        </NavbarButton>
      </PopoverTrigger>
      <PopoverContent className="p-2 select-none" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {friends && friends.length > 0 ? (
          friends.map((friend, index) => <Friend player={friend} key={index} onClick={() => setOpen(false)} />)
        ) : (
          <div className="text-sm flex flex-col gap-2 justify-center items-center">
            <p className="pointer-events-none">You don&#39;t have any friends :(</p>
            <Link href="/search">
              <Button size="sm" onClick={() => setOpen(false)}>
                Search Player
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
