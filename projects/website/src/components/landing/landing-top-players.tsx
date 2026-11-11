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
    <div className="ring-border bg-card/80 w-full overflow-hidden rounded-2xl ring-1 backdrop-blur-sm">
      <div className="border-border flex items-center justify-between border-b px-5 py-3.5">
        <div className="flex items-center gap-2">
          <SharedIcons.GlobalPlayersRankingIcon className="text-brand size-4" />
          <h2 className="text-foreground text-sm font-semibold">Top Players</h2>
        </div>
        <SimpleLink
          href="/ranking"
          className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
        >
          View all
        </SimpleLink>
      </div>
      <ol className="divide-border divide-y">
        {players.map((player, index) => (
          <li key={player.id} className="hover:bg-hover relative transition-colors">
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
              <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                {player.name}
              </span>
              <CountryFlag code={player.country} size={10} />
              <span className="text-pp w-24 shrink-0 text-right text-sm font-bold tabular-nums">
                {formatPp(player.pp)}pp
              </span>
            </SimpleLink>
          </li>
        ))}
      </ol>
    </div>
  );
}
