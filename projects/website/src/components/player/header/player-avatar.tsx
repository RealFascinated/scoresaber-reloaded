import { cn } from "@/common/utils";
import Avatar from "@/components/avatar";
import SimpleTooltip from "@/components/simple-tooltip";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { env } from "@ssr/common/env";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { useState } from "react";
import { toast } from "sonner";

type PlayerAvatarProps = {
  /**
   * The player to display.
   */
  player: ScoreSaberPlayer;
};

export default function PlayerAvatar({ player }: PlayerAvatarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;

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
        className="pointer-events-none"
        alt={`${player.name}'s Profile Picture`}
      />
      <div className="absolute right-[3px] top-[3px] z-10">
        <SimpleTooltip display="Refresh player">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-muted/90 hover:bg-muted flex size-7 cursor-pointer items-center justify-center rounded-md"
          >
            <ArrowPathIcon className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </button>
        </SimpleTooltip>
      </div>
    </div>
  );
}
