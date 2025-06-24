"use client";

import Database from "@/common/database/database";
import Avatar from "@/components/avatar";
import useDatabase from "@/hooks/use-database";
import { truncateText } from "@ssr/common/string-utils";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import SimpleTooltip from "../simple-tooltip";

export default function ProfileButton() {
  const database: Database = useDatabase();
  const mainPlayer = useLiveQuery(() => database.getMainPlayer());

  if (mainPlayer == undefined) {
    return;
  }

  return (
    <SimpleTooltip display="Click to view your profile" side="bottom">
      <Link
        href={`/player/${mainPlayer.id}`}
        className="hover:bg-muted/50 flex h-full cursor-pointer items-center rounded-md p-2 transition-all"
      >
        <div className="flex h-full items-center gap-2">
          <Avatar
            src={mainPlayer.avatar}
            className="ring-border/50 h-6 w-6 rounded-full ring-1"
            alt={`${mainPlayer.name}'s Profile Picture`}
          />
          <p className="text-foreground hidden text-sm font-medium lg:block">
            {truncateText(mainPlayer.name, 20)}
          </p>
        </div>
      </Link>
    </SimpleTooltip>
  );
}
