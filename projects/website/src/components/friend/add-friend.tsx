"use client";

import { cn } from "@/common/utils";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import useDatabase from "../../hooks/use-database";
import SimpleTooltip from "../simple-tooltip";
import { Button } from "../ui/button";

export default function FriendAction({
  player,
  iconOnly,
  className,
}: {
  /**
   * The ID of the players profile to claim.
   */
  player: ScoreSaberPlayer | ScoreSaberPlayerToken;

  /**
   * Whether to show the icon only.
   */
  iconOnly?: boolean;

  /**
   * The class name to apply to the button.
   */
  className?: string;
}) {
  const { id, name } = player;

  const database = useDatabase();
  const isFriend = useStableLiveQuery(() => database.isFriend(id));
  const playerId = useStableLiveQuery(() => database.getMainPlayerId());

  /**
   * Adds this player as a friend
   */
  async function addFriend() {
    const friends = await database.getFriendIds();
    if (friends.length >= SHARED_CONSTS.maxFriends) {
      toast.error(`You can only have a maximum of ${SHARED_CONSTS.maxFriends} friends.`);
      return;
    }

    await database.addFriend(id);
    toast.success(
      <p>
        You have added <b>{name}</b> as a friend.
      </p>
    );
  }

  /**
   * Removes this player as a friend
   */
  async function removeFriend() {
    await database.removeFriend(id);
    toast.success(
      <p>
        You have removed <b>{name}</b> as a friend.
      </p>
    );
  }

  if (!database) {
    return null;
  }

  // Don't show the button for the current user
  if (playerId == id) {
    return null;
  }

  const icon = isFriend ? (
    <UserMinus className="size-5 text-red-300" />
  ) : (
    <UserPlus className="size-5 text-white" />
  );

  const tooltipText = isFriend ? (
    <p>
      Remove <b>{name}</b> as a friend.
    </p>
  ) : (
    <p>
      Add <b>{name}</b> as a friend!
    </p>
  );

  return (
    <SimpleTooltip display={tooltipText} side={"bottom"}>
      <div onClick={isFriend ? removeFriend : addFriend} className={cn("w-fit cursor-pointer", className)}>
        {iconOnly ? icon : <Button variant={"outline"}>{icon}</Button>}
      </div>
    </SimpleTooltip>
  );
}
