"use client";

import { PersonIcon } from "@radix-ui/react-icons";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import useDatabase from "../../hooks/use-database";
import Tooltip from "../tooltip";
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
    await ssrApi.trackPlayer(id);
    await database.addFriend(id);
    toast(`You have added ${name} as a friend.`);
  }

  if (playerId == undefined) {
    return null;
  }

  // If the player is already a friend, don't show the button
  if (isFriend || playerId == id) {
    return null;
  }

  return (
    <Tooltip display={<p>Add {name} as a friend!</p>} side={"bottom"}>
      <div onClick={addFriend} className="cursor-pointer">
        {iconOnly ? (
          <PersonIcon className="size-6 text-green-500" />
        ) : (
          <Button variant={"outline"}>
            <PersonIcon className="size-6 text-green-500" />
          </Button>
        )}
      </div>
    </Tooltip>
  );
}
