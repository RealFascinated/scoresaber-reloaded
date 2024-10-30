"use client";

import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { Avatar, AvatarImage } from "../ui/avatar";
import NavbarButton from "./navbar-button";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/score-saber-player-token";
import Settings from "@/common/database/types/settings";
import Database from "@/common/database/database";
import { truncateText } from "@/common/string-utils";

export default function ProfileButton() {
  const database: Database = useDatabase();
  const settings = useLiveQuery<Settings | undefined>(() => database.getSettings());
  const claimedPlayer = useLiveQuery<ScoreSaberPlayerToken | undefined>(() => database.getClaimedPlayer());

  if (settings == undefined || claimedPlayer == undefined) {
    return; // Settings or player hasn't loaded yet
  }

  return (
    <Link href={`/player/${settings.playerId}`} className="pl-1 md:pl-2 flex items-center gap-4 h-full">
      <NavbarButton>
        <Avatar className="size-7">
          <AvatarImage
            alt="Profile Picture"
            src={`https://img.fascinated.cc/upload/w_24,h_24/${claimedPlayer.profilePicture}`}
          />
        </Avatar>
        <p className="pl-0.5 hidden lg:block text-ssr">{truncateText(claimedPlayer.name, 20)}</p>
      </NavbarButton>
    </Link>
  );
}
