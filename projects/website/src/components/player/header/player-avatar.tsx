import { cn } from "@/common/utils";
import Avatar from "@/components/avatar";
import SimpleTooltip from "@/components/simple-tooltip";
import { SharedIcons } from "@/shared-icons";
import { env } from "@ssr/common/env";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { useState } from "react";
import { toast } from "sonner";

type PlayerAvatarProps = {
  player: ScoreSaberPlayer;
};

export default function PlayerAvatar({ player }: PlayerAvatarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    try {
      const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/player/refresh/${player.id}`);
      if (response.status === 429) {
        toast.error("You have been rate limited. Try again later :(");
        return;
      }
      toast.success("Player refreshed successfully!");
    } catch (error) {
      console.error("Failed to refresh player:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="relative">
      <Avatar
        src={player.avatar}
        size={128}
        // Sized with CSS rather than a viewport check in JS, which is wrong in the server-rendered HTML on
        // desktop and made the avatar resize (and the page shift) once hydrated. The important modifiers
        // are needed to win over the inline minimum size Avatar sets.
        className="border-border pointer-events-none size-[88px]! min-h-0! min-w-0! border-2 lg:size-[128px]!"
        alt={`${player.name}'s Profile Picture`}
        priority
      />
      <div className="absolute top-[3px] right-[3px] z-10">
        <SimpleTooltip display={isRefreshing ? "Refreshing..." : "Refresh player"}>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh player data"
            className="bg-muted/90 hover:bg-muted focus-visible:ring-primary/50 flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SharedIcons.AvatarRefreshIcon className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </button>
        </SimpleTooltip>
      </div>
    </div>
  );
}
