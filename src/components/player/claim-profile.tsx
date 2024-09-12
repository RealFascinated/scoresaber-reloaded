"use client";

import { CheckIcon } from "@heroicons/react/24/solid";
import { useLiveQuery } from "dexie-react-hooks";
import { setPlayerIdCookie } from "../../common/website-utils";
import useDatabase from "../../hooks/use-database";
import { useToast } from "../../hooks/use-toast";
import Tooltip from "../tooltip";
import { Button } from "../ui/button";

type Props = {
  /**
   * The ID of the players profile to claim.
   */
  playerId: string;
};

export default function ClaimProfile({ playerId }: Props) {
  const database = useDatabase();
  const { toast } = useToast();
  const settings = useLiveQuery(() => database.getSettings());

  /**
   * Claims the profile.
   */
  async function claimProfile() {
    const settings = await database.getSettings();

    settings?.setPlayerId(playerId);
    setPlayerIdCookie(playerId);
    toast({
      title: "Profile Claimed",
      description: "You have claimed this profile.",
    });
  }

  if (settings?.playerId == playerId || settings == undefined) {
    return null; // Don't show the claim button if it's the same user.
  }

  return (
    <Tooltip display={<p>Set as your profile</p>}>
      <Button variant={"outline"} onClick={claimProfile}>
        <CheckIcon className="size-6 text-green-500" />
      </Button>
    </Tooltip>
  );
}
