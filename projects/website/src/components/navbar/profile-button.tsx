"use client";

import Database from "@/common/database/database";
import Avatar from "@/components/avatar";
import { useIsMobile } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
import { truncateText } from "@ssr/common/string-utils";
import { useLiveQuery } from "dexie-react-hooks";
import SimpleLink from "../simple-link";
import {
  DropdownButton,
  DropdownGroup,
  DropdownLabel,
  DropdownSeparator,
  HoverDropdown,
} from "../ui/hover-dropdown";
import { ConfirmationDialog } from "../ui/confirmation-dialog";

export default function ProfileButton() {
  const isMobile = useIsMobile();
  const database: Database = useDatabase();
  const mainPlayer = useLiveQuery(() => database.getMainPlayer());
  if (mainPlayer == undefined) {
    return;
  }

  async function unlinkAccount() {
    await database.setMainPlayerId("");
  }

  const buttonContent = (
    <div className="flex h-full items-center gap-2.5">
      <Avatar
        src={mainPlayer.avatar}
        className="ring-border/30 h-7 w-7 rounded-full ring-1"
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
          className="hover:bg-primary/5 flex h-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 transition-colors duration-200 hover:shadow-sm"
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
        <DropdownButton href="/settings">Settings</DropdownButton>
      </DropdownGroup>
      {mainPlayer.id && (
        <>
          <DropdownSeparator />

          {/* Unlink Account */}
          <ConfirmationDialog
            trigger={<DropdownButton style="warning">Unlink Account</DropdownButton>}
            title="Unlink Account"
            description="This will unlink your account from the website. You'll need to claim a new profile again."
            confirmText="Unlink"
            variant="destructive"
            onConfirm={unlinkAccount}
          />
        </>
      )}
    </HoverDropdown>
  );
}
