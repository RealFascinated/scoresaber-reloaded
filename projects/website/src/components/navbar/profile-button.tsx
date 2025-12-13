"use client";

import Database from "@/common/database/database";
import Avatar from "@/components/avatar";
import SimpleLink from "@/components/simple-link";
import { useIsMobile } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { truncateText } from "@ssr/common/string-utils";
import { ConfirmationDialog } from "../ui/confirmation-dialog";
import { DropdownButton, DropdownGroup, DropdownLabel, DropdownSeparator, HoverDropdown } from "../ui/hover-dropdown";

export default function ProfileButton() {
  const isMobile = useIsMobile("2xl");
  const database: Database = useDatabase();
  const mainPlayer = useStableLiveQuery(() => database.getMainPlayer());
  if (mainPlayer == undefined) {
    return;
  }

  async function unlinkAccount() {
    await database.setMainPlayerId(undefined);
  }

  const buttonContent = (
    <div className="flex h-full items-center gap-2.5">
      <Avatar
        src={mainPlayer.avatar}
        className="border-border size-7 rounded-full border"
        alt={`${mainPlayer.name}'s Profile Picture`}
      />
      <p className="text-primary hover:text-primary/80 hidden text-sm font-medium transition-colors duration-200 md:block">
        {truncateText(mainPlayer.name, 20)}
      </p>
    </div>
  );

  const trigger = (
    <div className="flex h-full items-center gap-(--spacing-sm)">
      {isMobile ? (
        buttonContent
      ) : (
        <SimpleLink
          href={`/player/${mainPlayer.id}`}
          className="hover:bg-primary/5 flex h-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 transition-colors duration-200 hover:shadow-sm"
        >
          {buttonContent}
        </SimpleLink>
      )}
    </div>
  );

  return (
    <HoverDropdown trigger={trigger} contentClassName="w-56">
      <DropdownLabel>Website</DropdownLabel>
      {isMobile && <DropdownButton href={`/player/${mainPlayer.id}`}>Open Profile</DropdownButton>}
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
