"use client";

import Friend from "@/components/friend/friend";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import useDatabase from "@/hooks/use-database";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { PersonIcon } from "@radix-ui/react-icons";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRef, useState } from "react";
import NavbarButton from "../navbar/navbar-button";

export default function FriendsButton() {
  const database = useDatabase();
  const friends = useLiveQuery(() => database.getFriends());
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="h-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <NavbarButton className="px-0">
          <PersonIcon className="size-5" />
          <span className="hidden xl:flex">Friends</span>
        </NavbarButton>
      </PopoverTrigger>
      <PopoverContent
        className="mt-2.5 p-2 text-sm select-none max-h-[400px] overflow-hidden overflow-y-auto w-screen md:w-[350px]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {friends && friends.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {friends
              .sort((a, b) => a.rank - b.rank)
              .map((friend, index) => (
                <Friend player={friend} key={index} onClick={() => setOpen(false)} />
              ))}
          </div>
        ) : (
          <div className="text-sm flex flex-col gap-2 justify-center items-center">
            <p className="pointer-events-none">You don&#39;t have any friends :(</p>
            <Link prefetch={false} href="/search">
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
