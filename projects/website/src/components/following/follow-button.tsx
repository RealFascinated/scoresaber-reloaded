"use client";

import { cn } from "@/common/utils";
import { useFollowActions, useFollowingIds } from "@/hooks/use-following";
import { useMainPlayerId } from "@/hooks/use-main-player";
import { SharedIcons } from "@/shared-icons";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { MedalRankingPlayer } from "@ssr/common/schemas/response/ranking/medal-rankings";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { toast } from "sonner";
import SimpleTooltip from "../simple-tooltip";
import { Button } from "../ui/button";

export default function FollowButton({
  player,
  iconOnly,
  className,
}: {
  player: ScoreSaberPlayer | MedalRankingPlayer | { id: string; name: string };

  iconOnly?: boolean;

  className?: string;
}) {
  const { id, name } = player;

  const { follow, unfollow, isSignedIn } = useFollowActions();
  const isFollowing = useFollowingIds().includes(id);
  const mainPlayerId = useMainPlayerId();

  function toggleFollowing() {
    if (isFollowing) {
      unfollow(id);
      toast.success(
        <p>
          You have unfollowed <b>{name}</b>.
        </p>
      );
      return;
    }

    if (follow(id) === "limit-reached") {
      toast.error(`You can only follow a maximum of ${SHARED_CONSTS.maxFollowing} players.`);
      return;
    }
    toast.success(
      <p>
        You are now following <b>{name}</b>.
      </p>
    );
  }

  // Following is saved to the account, so there is nothing to follow with when signed out
  if (!isSignedIn) {
    return null;
  }

  if (mainPlayerId == id) {
    return null;
  }

  const button = (
    <Button
      variant="outline"
      size={iconOnly ? "icon" : "default"}
      onClick={e => {
        e.stopPropagation();
        toggleFollowing();
      }}
      className={cn(
        "transition-all duration-200 active:scale-95 disabled:opacity-100",
        iconOnly ? "size-8 rounded-full" : "gap-2",
        isFollowing
          ? "border-destructive/40 bg-destructive/10 text-destructive hover:border-destructive hover:bg-destructive/20"
          : "border-ssr/40 bg-ssr/10 text-ssr hover:border-primary hover:bg-primary hover:text-primary-foreground",
        className
      )}
    >
      {isFollowing ? (
        <>
          <SharedIcons.UnfollowIcon className={iconOnly ? "size-5" : "size-4"} />
          {!iconOnly && <span>Unfollow</span>}
        </>
      ) : (
        <>
          <SharedIcons.FollowIcon className={iconOnly ? "size-5" : "size-4"} />
          {!iconOnly && <span>Follow</span>}
        </>
      )}
    </Button>
  );

  if (!iconOnly) {
    return button;
  }

  const tooltipText = isFollowing ? (
    <p>
      Unfollow <b>{name}</b>.
    </p>
  ) : (
    <p>
      Follow <b>{name}</b>!
    </p>
  );

  return (
    <SimpleTooltip display={tooltipText} side="bottom">
      {button}
    </SimpleTooltip>
  );
}
