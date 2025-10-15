"use client";

import { cn } from "@/common/utils";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { useLiveQuery } from "dexie-react-hooks";
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
  const isFriend = useLiveQuery(() => database.isFriend(id));
  const playerId = useLiveQuery(() => database.getMainPlayerId());

  /**
   * Adds this player as a friend
   */
  async function addFriend() {
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
      <div
        onClick={isFriend ? removeFriend : addFriend}
        className={cn("w-fit cursor-pointer", className)}
      >
        {iconOnly ? icon : <Button variant={"outline"}>{icon}</Button>}
      </div>
    </SimpleTooltip>
  );
}
