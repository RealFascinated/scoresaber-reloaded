"use client";

import Database from "@/common/database/database";
import Avatar from "@/components/avatar";
import useDatabase from "@/hooks/use-database";
import { truncateText } from "@ssr/common/string-utils";
import { useLiveQuery } from "dexie-react-hooks";
import Settings from "../settings/settings";
import SimpleLink from "../simple-link";
import {
  DropdownButton,
  DropdownGroup,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  HoverDropdown,
} from "../ui/hover-dropdown";
import UnlinkProfile from "./unlink-profile";
import { useIsMobile } from "@/contexts/viewport-context";

export default function ProfileButton() {
  const isMobile = useIsMobile();
  const database: Database = useDatabase();
  const mainPlayer = useLiveQuery(() => database.getMainPlayer());
  if (mainPlayer == undefined) {
    return;
  }

  const buttonContent = (
    <div className="flex h-full items-center gap-2">
      <Avatar
        src={mainPlayer.avatar}
        className="ring-border/50 h-6 w-6 rounded-full ring-1"
        alt={`${mainPlayer.name}'s Profile Picture`}
      />
      <p className="text-primary hover:text-primary/70 hidden text-sm font-medium transition-all lg:block">
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
          className="flex h-full cursor-pointer items-center rounded-md transition-all"
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
