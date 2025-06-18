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
    <Link href={`/player/${mainPlayer.id}`} className="flex h-full items-center gap-4 pl-1">
      <SimpleTooltip display="Click to view your profile" side="bottom">
        <NavbarButton className="px-0">
          <Avatar
            src={mainPlayer.avatar}
            className="h-6 w-6"
            alt={`${mainPlayer.name}'s Profile Picture`}
          />
          <p className="text-ssr hidden pl-0.5 lg:block">{truncateText(mainPlayer.name, 20)}</p>
        </NavbarButton>
      </SimpleTooltip>
    </Link>
  );
}
