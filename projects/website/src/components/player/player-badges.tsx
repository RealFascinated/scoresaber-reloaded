import SimpleTooltip from "@/components/simple-tooltip";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerBadgeImage } from "./player-badge-image";

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerBadges({ player }: Props) {
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-2 lg:justify-start">
      {player.badges?.map((badge, index) => {
        return (
          <SimpleTooltip
            key={badge.url + String(index)}
            display={<p className="pointer-events-none cursor-default">{badge.description}</p>}
            showOnMobile
          >
            <div>
              <PlayerBadgeImage url={badge.url} description={badge.description} />
            </div>
          </SimpleTooltip>
        );
      })}
    </div>
  );
}
