"use client";

import { setCookieValue } from "@/common/cookie.util";
import { SettingIds } from "@/common/database/database";
import SimpleTooltip from "@/components/simple-tooltip";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
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
    <SimpleTooltip display={<p>Claim this player to use it as your profile.</p>} side="bottom">
      <ConfirmationDialog
        trigger={
          <Button variant={"outline"}>
            <ShieldCheck className="size-5 text-green-500" />
          </Button>
        }
        title="Claim Profile"
        description={
          mainPlayer
            ? `This will overwrite your current profile (${mainPlayer.name}). Are you sure you want to do this?`
            : "Are you sure you want to claim this profile?"
        }
        onConfirm={claimProfile}
      />
    </SimpleTooltip>
  );
}
