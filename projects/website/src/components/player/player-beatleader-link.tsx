import Tooltip from "@/components/tooltip";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import Link from "next/link";
import BeatLeaderLogo from "@/components/logos/beatleader-logo";

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerBeatLeaderLink({ player }: Props) {
  return (
    <div className="flex gap-2">
      <Tooltip display={<p>Click to open the BeatLeader profile for {player.name}</p>} side="bottom">
        <Link
          prefetch={false}
          href={`https://beatleader.xyz/u/${player.id}`}
          target="_blank"
          className="cursor-pointer"
        >
          <BeatLeaderLogo size={23} />
        </Link>
      </Tooltip>
    </div>
  );
}
