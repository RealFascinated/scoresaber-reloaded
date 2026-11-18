import SimpleLink from "@/components/simple-link";
import { ScoreSaberLeaderboardPlayerInfo } from "@ssr/common/schemas/scoresaber/leaderboard/player-info";
import Avatar from "../avatar";

export default function PlayerScoreHeader({ player }: { player: ScoreSaberLeaderboardPlayerInfo }) {
  return (
    <div className="flex w-fit items-center gap-2 rounded-md rounded-b-none bg-primary/20 p-2">
      <Avatar src={player.avatar} alt={`${player.name}'s Profile Picture`} size={20} />
      <SimpleLink href={`/player/${player.id}`}>
        <p className="text-sm transition-all hover:text-primary">{player.name}</p>
      </SimpleLink>
    </div>
  );
}
