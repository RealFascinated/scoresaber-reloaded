import Avatar from "@/components/avatar";
import CountryFlag from "@/components/ui/country-flag";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/leaderboard-player-info";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { getScoreSaberAvatar, getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import { clsx } from "clsx";
import Link from "next/link";

export function PlayerInfo({
  player,
  highlightedPlayerId,
  className,
  hideCountryFlag,
  useLink,
  hoverBrightness = true,
}: {
  player: ScoreSaberPlayerToken | ScoreSaberLeaderboardPlayerInfoToken | ScoreSaberPlayer;
  highlightedPlayerId?: string;
  className?: string;
  hideCountryFlag?: boolean;
  useLink?: boolean;
  hoverBrightness?: boolean;
}) {
  const name = (
    <p
      className={clsx(
        hoverBrightness ? "transition-all hover:brightness-[66%]" : "",
        player.id == highlightedPlayerId ? "font-bold" : "",
        `w-[140px] overflow-hidden text-left break-all text-ellipsis whitespace-nowrap`,
        className
      )}
      style={{
        color: getScoreSaberRoles(player)[0]?.color,
      }}
    >
      {player.name}
    </p>
  );

  return (
    <div className="flex items-center gap-2">
      <Avatar
        src={getScoreSaberAvatar(player)}
        className="pointer-events-none h-[24px] w-[24px]"
        alt={`${player.name}'s Profile Picture`}
      />
      {!hideCountryFlag && <CountryFlag code={player.country!} size={10} />}
      {useLink ? <Link href={`/player/${player.id}`}>{name}</Link> : name}
    </div>
  );
}
