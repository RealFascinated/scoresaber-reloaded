import { PlayerAvatar } from "@/components/ranking/player-avatar";
import SimpleLink from "@/components/simple-link";
import CountryFlag from "@/components/ui/country-flag";
import { SharedIcons } from "@/shared-icons";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatPp } from "@ssr/common/utils/number-utils";

const PODIUM_COLORS = ["text-medals", "text-foreground", "text-streak"];

type LandingTopPlayersProps = {
  players: ScoreSaberPlayer[];
};

/**
 * A preview of the top of the global ranking for the landing page hero.
 */
export function LandingTopPlayers({ players }: LandingTopPlayersProps) {
  return (
    <div className="w-full overflow-hidden rounded-2xl bg-card/80 ring-1 ring-border backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <SharedIcons.GlobalPlayersRankingIcon className="size-4 text-brand" />
          <h2 className="text-sm font-semibold text-foreground">Top Players</h2>
        </div>
        <SimpleLink
          href="/ranking"
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
        </SimpleLink>
      </div>
      <ol className="divide-y divide-border">
        {players.map((player, index) => (
          <li key={player.id} className="relative transition-colors hover:bg-hover">
            <SimpleLink
              href={`/player/${player.id}`}
              className="flex items-center gap-3 px-5 py-3 after:absolute after:inset-0"
            >
              <span
                className={`w-6 shrink-0 text-sm font-bold tabular-nums ${PODIUM_COLORS[index] ?? "text-muted-foreground"}`}
              >
                #{player.rank}
              </span>
              <PlayerAvatar profilePicture={player.avatar} name={player.name} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {player.name}
              </span>
              <CountryFlag code={player.country} size={10} />
              <span className="w-24 shrink-0 text-right text-sm font-bold text-pp tabular-nums">
                {formatPp(player.pp)}pp
              </span>
            </SimpleLink>
          </li>
        ))}
      </ol>
    </div>
  );
}
