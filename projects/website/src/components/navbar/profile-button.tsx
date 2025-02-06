"use client";

import Database from "@/common/database/database";
import Avatar from "@/components/avatar";
import useDatabase from "@/hooks/use-database";
import useSettings from "@/hooks/use-settings";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { truncateText } from "@ssr/common/string-utils";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import NavbarButton from "./navbar-button";

export default function ProfileButton() {
  const database: Database = useDatabase();
  const settings = useSettings();
  const claimedPlayer = useLiveQuery<ScoreSaberPlayer | undefined>(() =>
    database.getClaimedPlayer()
  );

  if (settings == undefined || claimedPlayer == undefined) {
    return; // Settings or player hasn't loaded yet
  }

  return (
    <Link
      prefetch={false}
      href={`/player/${settings.playerId}`}
      className="pl-1 flex items-center gap-4 h-full"
    >
      <NavbarButton className="px-0">
        <Avatar
          src={claimedPlayer.avatar}
          className="w-6 h-6"
          alt={`${claimedPlayer.name}'s Profile Picture`}
        />
        <p className="pl-0.5 hidden lg:block text-ssr">{truncateText(claimedPlayer.name, 20)}</p>
      </NavbarButton>
    </Link>
  );
}
