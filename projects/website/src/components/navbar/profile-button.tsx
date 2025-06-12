"use client";

import Database from "@/common/database/database";
import Avatar from "@/components/avatar";
import useDatabase from "@/hooks/use-database";
import { truncateText } from "@ssr/common/string-utils";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import SimpleTooltip from "../simple-tooltip";
import NavbarButton from "./navbar-button";

export default function ProfileButton() {
  const database: Database = useDatabase();
  const mainPlayer = useLiveQuery(() => database.getMainPlayer());

  if (mainPlayer == undefined) {
    return;
  }

  return (
    <Link
      prefetch={false}
      href={`/player/${mainPlayer.id}`}
      className="pl-1 flex items-center gap-4 h-full"
    >
      <SimpleTooltip display="Click to view your profile">
        <NavbarButton className="px-0">
          <Avatar
            src={mainPlayer.avatar}
            className="w-6 h-6"
            alt={`${mainPlayer.name}'s Profile Picture`}
          />
          <p className="pl-0.5 hidden lg:block text-ssr">{truncateText(mainPlayer.name, 20)}</p>
        </NavbarButton>
      </SimpleTooltip>
    </Link>
  );
}
