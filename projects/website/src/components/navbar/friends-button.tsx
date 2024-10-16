"use client";

import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import NavbarButton from "./navbar-button";
import { PersonIcon } from "@radix-ui/react-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Friend from "@/components/friend/friend";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function FriendsButton() {
  const [open, setOpen] = useState(false);

  const database = useDatabase();
  const friends = useLiveQuery(() => database.getFriends());
  if (friends == undefined) {
    return; // Friends haven't loaded yet
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="h-full">
        <NavbarButton>
          <PersonIcon className="w-6 h-6" />
          <p className="hidden lg:block">Friends</p>
        </NavbarButton>
      </PopoverTrigger>
      <PopoverContent className="p-2">
        {friends.length > 0 ? (
          friends.map(friend => <Friend player={friend} key={friend.id} onClick={() => setOpen(false)} />)
        ) : (
          <div className="text-sm flex flex-col gap-2 justify-center items-center">
            <p>You don&#39;t have any friends :(</p>

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
