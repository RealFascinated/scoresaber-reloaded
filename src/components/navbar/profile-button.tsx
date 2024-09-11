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
    <NavbarButton>
      <Link href={`/player/${settings.playerId}`} className="flex items-center gap-2">
        <Avatar className="w-6 h-6">
          <AvatarImage src={`https://cdn.scoresaber.com/avatars/${settings.playerId}.jpg`} />
        </Avatar>
        <p>You</p>
      </Link>
    </NavbarButton>
  );
}
