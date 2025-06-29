"use client";

import Avatar from "@/components/avatar";
import { useMainPlayer } from "@/hooks/user-main-player";
import { truncateText } from "@ssr/common/string-utils";
import Link from "next/link";
import SimpleTooltip from "../simple-tooltip";
import { Button } from "../ui/button";

export default function ProfileButton() {
  const { mainPlayer, isLoading, isError } = useMainPlayer();
  console.log(mainPlayer, isLoading, isError);

  if (mainPlayer == undefined && isLoading) {
    return;
  }

  if (mainPlayer == undefined || isError) {
    return <Button>Link Account</Button>;
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
          <p className="text-primary hidden text-sm font-medium lg:block">
            {truncateText(mainPlayer.name, 20)}
          </p>
        </div>
      </Link>
    </SimpleTooltip>
  );
}
