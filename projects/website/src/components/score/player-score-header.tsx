import SimpleLink from "@/components/simple-link";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/leaderboard-player-info";
import { getScoreSaberAvatar } from "@ssr/common/utils/scoresaber.util";
import Avatar from "../avatar";

export default function PlayerScoreHeader({
  player,
}: {
  player: ScoreSaberPlayer | ScoreSaberLeaderboardPlayerInfoToken;
}) {
  return (
    <div className="bg-primary/20 flex w-fit items-center gap-2 rounded-md rounded-b-none p-2">
      <Avatar src={getScoreSaberAvatar(player)} alt={player.name ?? ""} size={20} />
      <SimpleLink href={`/player/${player.id}`}>
        <p className="hover:text-primary text-sm transition-all">{player.name}</p>
      </SimpleLink>
    </div>
  );
}
