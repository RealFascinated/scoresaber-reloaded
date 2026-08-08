"use client";

import { cn } from "@/common/utils";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { SharedIcons } from "@/shared-icons";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { MedalRankingPlayer } from "@ssr/common/schemas/response/ranking/medal-rankings";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { useState } from "react";
import { toast } from "sonner";
import useDatabase from "../../hooks/use-database";
import SimpleTooltip from "../simple-tooltip";
import { Spinner } from "../spinner";
import { Button } from "../ui/button";

export default function FriendAction({
  player,
  iconOnly,
  className,
}: {
  /**
   * The player to add or remove as a friend.
   */
  player: ScoreSaberPlayer | MedalRankingPlayer | { id: string; name: string };

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
  const [pending, setPending] = useState(false);

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

  /**
   * Toggles the friend status of this player
   */
  async function toggleFriend() {
    if (pending || isFriend === undefined) {
      return;
    }

    setPending(true);
    try {
      if (isFriend) {
        await removeFriend();
      } else {
        await addFriend();
      }
    } finally {
      setPending(false);
    }
  }

  if (!database) {
    return null;
  }

  // Don't show the button for the current user
  if (playerId == id) {
    return null;
  }

  const button = (
    <Button
      variant="outline"
      size={iconOnly ? "icon" : "default"}
      onClick={e => {
        e.stopPropagation();
        void toggleFriend();
      }}
      disabled={pending}
      className={cn(
        "transition-all duration-200 active:scale-95 disabled:opacity-100",
        iconOnly ? "size-8 rounded-full" : "gap-2",
        isFriend
          ? "border-destructive/40 bg-destructive/10 text-destructive hover:border-destructive hover:bg-destructive hover:text-white"
          : "border-ssr/40 bg-ssr/10 text-ssr hover:border-ssr hover:bg-ssr hover:text-white",
        className
      )}
    >
      {pending ? (
        <Spinner size="sm" />
      ) : isFriend ? (
        <>
          <SharedIcons.RemoveFriendIcon className={iconOnly ? "size-5" : "size-4"} />
          {!iconOnly && <span>Remove Friend</span>}
        </>
      ) : (
        <>
          <SharedIcons.AddFriendIcon className={iconOnly ? "size-5" : "size-4"} />
          {!iconOnly && <span>Add Friend</span>}
        </>
      )}
    </Button>
  );

  if (!iconOnly) {
    return button;
  }

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
    <SimpleTooltip display={tooltipText} side="bottom">
      {button}
    </SimpleTooltip>
  );
}
