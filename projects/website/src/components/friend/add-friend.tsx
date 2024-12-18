"use client";

import { useLiveQuery } from "dexie-react-hooks";
import useDatabase from "../../hooks/use-database";
import { useToast } from "@/hooks/use-toast";
import Tooltip from "../tooltip";
import { Button } from "../ui/button";
import { PersonIcon } from "@radix-ui/react-icons";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { trackPlayer } from "@ssr/common/utils/player-utils";
import useSettings from "@/hooks/use-settings";

type Props = {
  /**
   * The ID of the players profile to claim.
   */
  player: ScoreSaberPlayer;
};

export default function AddFriend({ player }: Props) {
  const { id, name } = player;

  const settings = useSettings();
  const database = useDatabase();
  const isFriend = useLiveQuery(() => database.isFriend(id));
  const { toast } = useToast();

  /**
   * Adds this player as a friend
   */
  async function addFriend() {
    await trackPlayer(id);
    await database.addFriend(id);
    toast({
      title: "Friend Added",
      description: `You have added ${name} as a friend.`,
    });
  }

  // Database is not ready
  if (settings == undefined || database == undefined) {
    return null;
  }

  // If the player is already a friend, don't show the button
  if (isFriend || settings?.playerId == id) {
    return null;
  }

  return (
    <Tooltip display={<p>Add {name} as a friend!</p>} side={"bottom"}>
      <Button variant={"outline"} onClick={addFriend}>
        <PersonIcon className="size-6 text-green-500" />
      </Button>
    </Tooltip>
  );
}
