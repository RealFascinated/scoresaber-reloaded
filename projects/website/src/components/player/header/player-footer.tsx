import PlayerAccBadges from "@/components/player/header/acc-badges";
import PlayerLinks from "@/components/player/header/player-links";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";

export default function PlayerFooter({ player }: { player: ScoreSaberPlayer }) {
  return (
    <div className="flex flex-col-reverse items-center md:flex-row gap-2 md:justify-between">
      <PlayerLinks player={player} />
      <PlayerAccBadges badges={player.accBadges} />
    </div>
  );
}
