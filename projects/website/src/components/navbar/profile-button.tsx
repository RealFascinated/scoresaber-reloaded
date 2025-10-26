"use client";

import Database from "@/common/database/database";
import Avatar from "@/components/avatar";
import { useIsMobile } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
import { truncateText } from "@ssr/common/string-utils";
import { useLiveQuery } from "dexie-react-hooks";
import Settings from "../settings/settings";
import SimpleLink from "../simple-link";
import {
  DropdownButton,
  DropdownGroup,
  DropdownLabel,
  DropdownSeparator,
  HoverDropdown,
} from "../ui/hover-dropdown";
import UnlinkProfile from "./unlink-profile";

export default function ProfileButton() {
  const isMobile = useIsMobile();
  const database: Database = useDatabase();
  const mainPlayer = useLiveQuery(() => database.getMainPlayer());
  if (mainPlayer == undefined) {
    return;
  }

  const buttonContent = (
    <div className="flex h-full items-center gap-2.5">
      <Avatar
        src={mainPlayer.avatar}
        className="h-7 w-7 rounded-full ring-1 ring-border/30"
        alt={`${mainPlayer.name}'s Profile Picture`}
      />
      <p className="text-primary hover:text-primary/80 hidden text-sm font-medium transition-colors duration-200 lg:block">
        {truncateText(mainPlayer.name, 20)}
      </p>
    </div>
  );

  const trigger = (
    <div className="flex h-full items-center gap-2 p-2">
      {isMobile ? (
        buttonContent
      ) : (
        <SimpleLink
          href={`/player/${mainPlayer.id}`}
          className="flex h-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 transition-all duration-200 hover:bg-primary/5 hover:shadow-sm"
          data-umami-event="player-profile-button"
        >
          {buttonContent}
        </SimpleLink>
      )}
    </div>
  );

  return (
    <HoverDropdown trigger={trigger} contentClassName="w-56">
      <DropdownLabel>Website</DropdownLabel>
      {isMobile && (
        <DropdownButton href={`/player/${mainPlayer.id}`} data-umami-event="player-profile-button">
          Open Profile
        </DropdownButton>
      )}
      <DropdownGroup>
        <Settings />
      </DropdownGroup>
      {mainPlayer.id && (
        <>
          <DropdownSeparator />
          <UnlinkProfile />
        </>
      )}
    </HoverDropdown>
  );
}
