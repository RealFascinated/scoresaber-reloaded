import Card from "@/components/card";
import { PlayerAvatar } from "@/components/ranking/player-avatar";
import SimpleLink from "@/components/simple-link";
import CountryFlag from "@/components/ui/country-flag";
import type { RankedBatchPlayerChange } from "@ssr/common/schemas/ranked-batch/ranked-batch";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { formatPpDelta, getDeltaClass } from "./ranked-batch-format";

type RankedBatchPlayersProps = {
  title: string;
  players: RankedBatchPlayerChange[];
};

export function RankedBatchPlayers({ title, players }: RankedBatchPlayersProps) {
  return (
    <Card className="min-w-0 flex-1 gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      {players.length === 0 && <p className="text-sm text-muted-foreground">No players</p>}
      {players.map(player => (
        <SimpleLink
          key={player.playerId}
          href={`/player/${player.playerId}`}
          className="flex items-center gap-2.5 rounded-md p-1 transition-colors hover:bg-accent/40"
        >
          <PlayerAvatar profilePicture={player.avatar} name={player.name} />
          <CountryFlag code={player.country} size={14} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{player.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatPp(player.ppBefore)}pp {"->"} {formatPp(player.ppAfter)}pp ·{" "}
              {formatNumberWithCommas(player.scoresChanged)} {player.scoresChanged === 1 ? "score" : "scores"}
            </span>
          </div>
          <span className={`text-sm font-semibold tabular-nums ${getDeltaClass(player.ppDelta)}`}>
            {formatPpDelta(player.ppDelta)}
          </span>
        </SimpleLink>
      ))}
    </Card>
  );
}
