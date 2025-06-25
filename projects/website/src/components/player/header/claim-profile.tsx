"use client";

import { setCookieValue } from "@/common/cookie.util";
import { SettingIds } from "@/common/database/database";
import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import { BadgeCheckIcon } from "lucide-react";
import { toast } from "sonner";
import SimpleTooltip from "../../simple-tooltip";
import { Button } from "../../ui/button";

type Props = {
  /**
   * The ID of the players profile to claim.
   */
  playerId: string;
};

export default function ClaimProfile({ playerId }: Props) {
  const database = useDatabase();
  const mainPlayer = useLiveQuery(() => database.getMainPlayer());

  /**
   * Claims the profile.
   */
  async function claimProfile() {
    await database.setSetting(SettingIds.MainPlayer, playerId);

    setCookieValue("playerId", playerId);
    toast.success("You have claimed this profile.");
  }

  if (!database) {
    return null;
  }

  if (mainPlayer?.id == playerId) {
    return null; // Don't show the claim button if it's the same user.
  }

  return (
    <SimpleTooltip
      display={
        <div className="flex flex-col gap-2">
          <p>Set as your profile!</p>
          {mainPlayer && (
            <p className="text-red-400">
              This will overwrite your current profile ({mainPlayer.name})
            </p>
          )}
        </div>
      }
      side={"bottom"}
    >
      <Button variant={"outline"} onClick={claimProfile}>
        <BadgeCheckIcon className="size-5 text-green-500" />
      </Button>
    </SimpleTooltip>
  );
}
