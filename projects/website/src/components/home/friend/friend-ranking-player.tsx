import PlayerPreview from "@/components/player/player-preview";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import Link from "next/link";
import Avatar from "../../avatar";
import CountryFlag from "../../country-flag";

interface FriendRankingPlayerProps {
  player: ScoreSaberPlayer;
}

export function FriendRankingPlayer({ player }: FriendRankingPlayerProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-2 text-sm md:grid md:grid-cols-[auto_1fr_auto]">
      {/* Top row (mobile) / Left column (desktop) */}
      <div className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-start">
        {/* Ranks Container */}
        <div className="flex items-center gap-3">
          {/* Global Rank */}
          <Link
            href={`/ranking/${player.rankPages.global}`}
            className="flex w-14 items-center gap-1"
          >
            <p className="text-xs font-medium tabular-nums md:text-sm">
              #{player.rank == 0 ? "-" : player.rank}
            </p>
          </Link>

          {/* Country Rank */}
          <Link
            href={`/ranking/${player.country}/${player.rankPages.country}`}
            className="flex min-w-20 items-center gap-2"
          >
            <CountryFlag code={player.country} size={12} />
            <p className="text-xs font-medium tabular-nums md:text-sm">
              #{player.countryRank == 0 ? "-" : player.countryRank}
            </p>
          </Link>
        </div>

        {/* Mobile PP */}
        <p className="text-pp text-right text-xs md:hidden">{player.pp.toLocaleString()}pp</p>
      </div>

      {/* Player's Avatar and Name */}
      <PlayerPreview playerId={player.id}>
        <div className="flex w-full items-center gap-2 md:w-auto">
          <Avatar src={player.avatar} alt={player.name} size={22} />
          <Link
            href={`/player/${player.id}`}
            className="overflow-hidden transition-all hover:brightness-[66%]"
          >
            <p className="max-w-[160px] truncate md:max-w-[250px]">{player.name}</p>
          </Link>
        </div>
      </PlayerPreview>

      {/* Desktop PP */}
      <p className="text-pp hidden text-right text-sm md:block">{player.pp.toLocaleString()}pp</p>
    </div>
  );
}
