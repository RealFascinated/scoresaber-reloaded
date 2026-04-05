import SimpleLink from "@/components/simple-link";
import { ScoreSaberLeaderboardPlayerInfo } from "@ssr/common/schemas/scoresaber/leaderboard/player-info";
import Avatar from "../avatar";

export default function PlayerScoreHeader({ player }: { player: ScoreSaberLeaderboardPlayerInfo }) {
  return (
    <div className="bg-primary/20 flex w-fit items-center gap-2 rounded-md rounded-b-none p-2">
      <Avatar src={player.avatar} alt={`${player.name}'s Profile Picture`} size={20} />
      <SimpleLink href={`/player/${player.id}`}>
        <p className="hover:text-primary text-sm transition-all">{player.name}</p>
      </SimpleLink>
    </div>
  );
}
