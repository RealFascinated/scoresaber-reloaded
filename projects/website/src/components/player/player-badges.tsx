import SimpleTooltip from "@/components/simple-tooltip";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import Image from "next/image";

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerBadges({ player }: Props) {
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-2">
      {player.badges?.map((badge, index) => {
        return (
          <SimpleTooltip
            key={badge.url + String(index)}
            display={<p className="pointer-events-none cursor-default">{badge.description}</p>}
            showOnMobile
          >
            <div>
              <Image src={badge.url} alt={badge.description} width={80} height={30} />
            </div>
          </SimpleTooltip>
        );
      })}
    </div>
  );
}
