import { cn } from "@/common/utils";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";

type PlayerNameProps = {
  className?: string;
  player: ScoreSaberPlayer | ScoreSaberPlayerToken;
};

export function PlayerName({ className, player }: PlayerNameProps) {
  return (
    <div className={cn("flex min-w-0 flex-1 justify-start", className)}>
      <span
        className="truncate text-sm font-medium text-white"
        style={{
          color: getScoreSaberRoles(player)[0]?.color,
        }}
      >
        {player.name}
      </span>
    </div>
  );
}
