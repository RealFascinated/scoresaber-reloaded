import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";
import Image from "next/image";
import Tooltip from "@/components/tooltip";

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerBadges({ player }: Props) {
  return (
    <div className="flex flex-wrap gap-2 w-full items-center justify-center">
      {player.badges?.map((badge, index) => {
        return (
          <Tooltip
            side={"bottom"}
            key={index}
            display={<p>{badge.description}</p>}
          >
            <div>
              <Image
                src={badge.url}
                alt={badge.description}
                width={80}
                height={30}
              />
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}
