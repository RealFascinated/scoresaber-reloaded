"use client";

import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import NavbarButton from "./navbar-button";
import Database from "@/common/database/database";
import { truncateText } from "@/common/string-utils";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/player";
import useSettings from "@/hooks/use-settings";
import Avatar from "@/components/avatar";

export default function ProfileButton() {
  const database: Database = useDatabase();
  const settings = useSettings();
  const claimedPlayer = useLiveQuery<ScoreSaberPlayerToken | undefined>(() => database.getClaimedPlayer());

  if (settings == undefined || claimedPlayer == undefined) {
    return; // Settings or player hasn't loaded yet
  }

  return (
    <Link href={`/player/${settings.playerId}`} className="pl-1 flex items-center gap-4 h-full">
      <NavbarButton className="px-0">
        <Avatar
          src={claimedPlayer.profilePicture}
          className="w-6 h-6"
          alt={`${claimedPlayer.name}'s Profile Picture`}
        />
        <p className="pl-0.5 hidden lg:block text-ssr">{truncateText(claimedPlayer.name, 20)}</p>
      </NavbarButton>
    </Link>
  );
}
