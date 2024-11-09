"use client";

import { CheckIcon } from "@heroicons/react/24/solid";
import { useToast } from "@/hooks/use-toast";
import Tooltip from "../tooltip";
import { Button } from "../ui/button";
import { setCookieValue } from "@ssr/common/utils/cookie-utils";
import useSettings from "@/hooks/use-settings";

type Props = {
  /**
   * The ID of the players profile to claim.
   */
  playerId: string;
};

export default function ClaimProfile({ playerId }: Props) {
  const settings = useSettings();
  const { toast } = useToast();

  /**
   * Claims the profile.
   */
  async function claimProfile() {
    settings.setPlayerId(playerId);
    await setCookieValue("playerId", playerId);
    toast({
      title: "Profile Claimed",
      description: "You have claimed this profile.",
    });
  }

  // Database is not ready
  if (settings == undefined) {
    return null;
  }

  if (settings?.playerId == playerId) {
    return null; // Don't show the claim button if it's the same user.
  }

  return (
    <Tooltip
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
    </Tooltip>
  );
}
