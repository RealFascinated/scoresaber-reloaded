"use client";

import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { useLiveQuery } from "dexie-react-hooks";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import useDatabase from "../../hooks/use-database";
import SimpleTooltip from "../simple-tooltip";
import { Button } from "../ui/button";

type Props = {
  /**
   * The ID of the players profile to claim.
   */
  player: ScoreSaberPlayer | ScoreSaberPlayerToken;

  /**
   * Whether to show the icon only.
   */
  iconOnly?: boolean;
};

export default function AddFriend({ player, iconOnly }: Props) {
  const { id, name } = player;

  const database = useDatabase();
  const isFriend = useLiveQuery(() => database.isFriend(id));
  const playerId = useLiveQuery(() => database.getMainPlayerId());

  /**
   * Adds this player as a friend
   */
  async function addFriend() {
    await database.addFriend(id);
    toast(`You have added ${name} as a friend.`);
  }

  if (!database) {
    return null;
  }

  if (playerId == undefined) {
    return null;
  }

  // If the player is already a friend, don't show the button
  if (isFriend || playerId == id) {
    return null;
  }

  return (
    <SimpleTooltip display={<p>Add {name} as a friend!</p>} side={"bottom"}>
      <div onClick={addFriend} className="cursor-pointer">
        {iconOnly ? (
          <UserPlus className="text-primary hover:text-primary/80 size-5 transition-colors" />
        ) : (
          <Button variant={"outline"}>
            <UserPlus className="text-primary size-5" />
          </Button>
        )}
      </div>
    </SimpleTooltip>
  );
}
