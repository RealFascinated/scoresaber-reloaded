import Tooltip from "@/components/tooltip";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerBadges({ player }: Props) {
  return (
    <div className="flex flex-wrap gap-2 w-full items-center justify-center">
      {player.badges?.map((badge, index) => {
        return (
          <Tooltip key={index} display={<p className="cursor-default pointer-events-none">{badge.description}</p>}>
            <div>
              <img src={badge.url} alt={badge.description} width={80} height={30} />
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}
