import Avatar from "@/components/avatar";
import SimpleLink from "@/components/simple-link";
import CountryFlag from "@/components/ui/country-flag";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberLeaderboardPlayerInfo } from "@ssr/common/schemas/scoresaber/leaderboard/player-info";
import { getScoreSaberAvatar, getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import { clsx } from "clsx";

export function PlayerInfo({
  player,
  highlightedPlayerId,
  className,
  hideCountryFlag,
  useLink,
}: {
  player: ScoreSaberLeaderboardPlayerInfo | ScoreSaberPlayer;
  highlightedPlayerId?: string;
  className?: string;
  hideCountryFlag?: boolean;
  useLink?: boolean;
}) {
  const name = (
    <p
      className={clsx(
        player.id == highlightedPlayerId ? "font-bold" : "",
        "overflow-hidden text-left break-all text-ellipsis whitespace-nowrap transition-all duration-200",
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
      <Avatar src={getScoreSaberAvatar(player)} size={26} alt={`${player.name}'s Profile Picture`} />
      {!hideCountryFlag && <CountryFlag code={player.country!} size={10} />}
      {useLink ? <SimpleLink href={`/player/${player.id}`}>{name}</SimpleLink> : name}
    </div>
  );
}
