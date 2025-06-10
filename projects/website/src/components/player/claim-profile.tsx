"use client";

import { setCookieValue } from "@/common/cookie.util";
import { SettingIds } from "@/common/database/database";
import useDatabase from "@/hooks/use-database";
import { CheckIcon } from "@heroicons/react/24/solid";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import SimpleTooltip from "../simple-tooltip";
import { Button } from "../ui/button";

type Props = {
  /**
   * The ID of the players profile to claim.
   */
  playerId: string;
};

export default function ClaimProfile({ playerId }: Props) {
  const database = useDatabase();
  const mainPlayerId = useLiveQuery(() => database.getMainPlayerId());

  /**
   * Claims the profile.
   */
  async function claimProfile() {
    await database.setSetting(SettingIds.MainPlayer, playerId);

    await setCookieValue("playerId", playerId);
    toast("You have claimed this profile.");
  }

  if (!database) {
    return null;
  }

  if (mainPlayerId == playerId) {
    return null; // Don't show the claim button if it's the same user.
  }

  return (
    <SimpleTooltip
      display={
        <div className="flex flex-col gap-2">
          <div>
            <p>Set as your profile!</p>
            <p>Claiming a profile will also initialize it for data tracking.</p>
          </div>
          <p className="text-red-600">This will overwrite your currently set profile (if any)</p>
        </div>
      }
      side={"bottom"}
    >
      <Button variant={"outline"} onClick={claimProfile}>
        <CheckIcon className="size-6 text-green-500" />
      </Button>
    </SimpleTooltip>
  );
}
