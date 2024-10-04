"use client";

import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { Avatar, AvatarImage } from "../ui/avatar";
import NavbarButton from "./navbar-button";

export default function ProfileButton() {
  const database = useDatabase();
  const settings = useLiveQuery(() => database.getSettings());

  if (settings == undefined) {
    return; // Settings hasn't loaded yet
  }

  if (settings.playerId == null) {
    return; // No player profile claimed
  }

  return (
    <Link href={`/player/${settings.playerId}`} className="flex items-center gap-2 h-full">
      <NavbarButton>
        <Avatar className="w-6 h-6">
          <AvatarImage
            alt="Profile Picture"
            src={`https://img.fascinated.cc/upload/w_24,h_24/https://cdn.scoresaber.com/avatars/${settings.playerId}.jpg`}
          />
        </Avatar>
        <p className="hidden lg:block">You</p>
      </NavbarButton>
    </Link>
  );
}
