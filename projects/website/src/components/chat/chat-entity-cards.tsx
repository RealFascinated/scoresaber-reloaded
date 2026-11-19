"use client";

import { getRankColor } from "@/common/rank-color-utils";
import { cn } from "@/common/utils";
import type { ChatEntityKind } from "@/components/chat/chat-directives";
import type { ChatEntityIndex, ChatMapInfo, ChatPlayerInfo } from "@/components/chat/chat-entity-index";
import { PlayerAvatar } from "@/components/ranking/player-avatar";
import { PlayerPpDisplay } from "@/components/ranking/player-pp-display";
import ScoreSongInfo from "@/components/score/score-song-info";
import SimpleLink from "@/components/simple-link";
import CountryFlag from "@/components/ui/country-flag";
import { Skeleton } from "@/components/ui/skeleton";
import { SharedIcons } from "@/shared-icons";
import type { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getScoreSaberLeaderboardCoverUrl } from "@ssr/common/utils/scoresaber.util";
import { getDifficulty } from "@ssr/common/utils/song-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext } from "react";

const EMPTY_INDEX: ChatEntityIndex = { maps: new Map(), players: new Map() };

const ChatEntityContext = createContext<ChatEntityIndex>(EMPTY_INDEX);

export const ChatEntityProvider = ChatEntityContext.Provider;

const ROW_CLASS = "flex h-16 w-full items-center gap-3 rounded-xl bg-card px-2.5 text-sm ring-1 ring-border";

const CHIP_CLASS =
  "rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary no-underline transition-colors hover:bg-primary/20";

function getMapCover(map: ChatMapInfo) {
  if (map.cover !== undefined) {
    return map.cover;
  }
  return map.songHash === undefined ? undefined : getScoreSaberLeaderboardCoverUrl(map.songHash);
}

function useChatMap(id: string) {
  const index = useContext(ChatEntityContext);
  const indexed = index.maps.get(id);
  const isComplete = indexed?.mapper !== undefined && indexed.songAuthor !== undefined;
  const query = useQuery({
    queryKey: ["chat-entity", "map", id],
    enabled: !isComplete,
    retry: false,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const response = await ssrApi.fetchLeaderboard(Number(id), "basic");
      if (response === undefined || response === null) {
        return null;
      }
      const { leaderboard } = response;
      const map: ChatMapInfo = {
        id,
        name: leaderboard.songName,
        mapper: leaderboard.levelAuthorName,
        songAuthor: leaderboard.songAuthorName,
        difficulty: leaderboard.difficulty.difficulty,
        stars: leaderboard.stars,
        ranked: leaderboard.ranked,
        qualified: leaderboard.qualified,
        cover: leaderboard.songArt,
      };
      return map;
    },
  });
  return {
    data: isComplete ? indexed : (query.data ?? indexed),
    isLoading: indexed === undefined && query.isPending,
  };
}

function useChatPlayer(id: string) {
  const index = useContext(ChatEntityContext);
  const indexed = index.players.get(id);
  const isComplete = indexed?.rank !== undefined;
  const query = useQuery({
    queryKey: ["chat-entity", "player", id],
    enabled: !isComplete,
    retry: false,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const player = await ssrApi.getScoreSaberPlayer(id, "basic");
      if (player === undefined || player === null) {
        return null;
      }
      const info: ChatPlayerInfo = {
        id,
        name: player.name,
        country: player.country,
        rank: player.rank,
        countryRank: player.countryRank,
        pp: player.pp,
        avatar: player.avatar,
      };
      return info;
    },
  });
  const data = isComplete ? indexed : (query.data ?? indexed);
  return { data, isLoading: !isComplete && query.isPending };
}

function RowSkeleton() {
  return (
    <div className={cn(ROW_CLASS, "pointer-events-none")}>
      <Skeleton className="size-12 shrink-0 rounded-md" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

function isKnownDifficulty(difficulty: string) {
  try {
    getDifficulty(difficulty as MapDifficulty);
    return true;
  } catch {
    return false;
  }
}

function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-6 cursor-default items-center justify-center rounded-md bg-accent/60 px-1.5 text-xs font-medium ring-1 ring-border ring-inset">
      {children}
    </div>
  );
}

function MapRow({ id }: { id: string }) {
  const { data, isLoading } = useChatMap(id);
  if (isLoading) {
    return <RowSkeleton />;
  }
  if (data === undefined) {
    return null;
  }
  const cover = getMapCover(data);
  if (cover === undefined || !isKnownDifficulty(data.difficulty)) {
    return (
      <SimpleLink href={`/leaderboard/${id}`} className={cn(ROW_CLASS, "no-underline")}>
        <p className="truncate font-semibold text-song-name">{data.name}</p>
      </SimpleLink>
    );
  }
  const hasStars = (data.ranked || data.qualified) && data.stars > 0;
  return (
    <div className={cn(ROW_CLASS, "relative")}>
      <div className="flex min-w-0 flex-1 items-center">
        <ScoreSongInfo
          song={{ name: data.name, authorName: data.songAuthor ?? "", art: cover }}
          level={{ authorName: data.mapper ?? "", difficulty: data.difficulty as MapDifficulty }}
          metric={hasStars ? { value: data.stars, icon: SharedIcons.DifficultyStarIcon } : undefined}
          leaderboardId={Number(id)}
          stretchSongNameLink
          imageSize={48}
        />
      </div>
      {data.qualified && !data.ranked && (
        <div className="hidden shrink-0 sm:block">
          <StatusBadge>Qualified</StatusBadge>
        </div>
      )}
    </div>
  );
}

function PlayerRow({ id }: { id: string }) {
  const { data, isLoading } = useChatPlayer(id);
  if (isLoading) {
    return <RowSkeleton />;
  }
  if (data === undefined) {
    return null;
  }
  return (
    <div className={cn(ROW_CLASS, "relative")}>
      {data.rank !== undefined && (
        <span className={cn("shrink-0 text-sm font-bold tabular-nums", getRankColor(data.rank))}>
          #{data.rank}
        </span>
      )}
      <SimpleLink
        href={`/player/${id}`}
        className="flex min-w-0 flex-1 items-center gap-2.5 after:absolute after:inset-0"
      >
        <PlayerAvatar
          profilePicture={data.avatar ?? `https://cdn.scoresaber.com/avatars/${id}.jpg`}
          name={data.name}
        />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{data.name}</span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
            {data.country !== undefined && <CountryFlag code={data.country} size={12} />}
            {data.countryRank !== undefined && <>#{formatNumberWithCommas(data.countryRank)}</>}
          </span>
        </div>
      </SimpleLink>
      {data.pp !== undefined && <PlayerPpDisplay pp={data.pp} className="shrink-0" />}
    </div>
  );
}

function ChipLink({
  href,
  isUnresolved,
  children,
}: {
  href: string;
  isUnresolved: boolean;
  children: ReactNode;
}) {
  if (isUnresolved) {
    return <>{children}</>;
  }
  return (
    <SimpleLink href={href} className={CHIP_CLASS}>
      {children}
    </SimpleLink>
  );
}

function MapChip({ id, children }: { id: string; children: ReactNode }) {
  const { data, isLoading } = useChatMap(id);
  return (
    <ChipLink href={`/leaderboard/${id}`} isUnresolved={!isLoading && data === undefined}>
      {children}
    </ChipLink>
  );
}

function PlayerChip({ id, children }: { id: string; children: ReactNode }) {
  const { data, isLoading } = useChatPlayer(id);
  return (
    <ChipLink href={`/player/${id}`} isUnresolved={!isLoading && data === undefined}>
      {children}
    </ChipLink>
  );
}

/**
 * The rendering of one `map` or `player` directive: a compact row for a leaf directive, a link chip for an inline one.
 */
export function ChatEntity({
  kind,
  id,
  isInline,
  children,
}: {
  kind: ChatEntityKind;
  id: string;
  isInline: boolean;
  children: ReactNode;
}) {
  if (isInline) {
    return kind === "map" ? (
      <MapChip id={id}>{children}</MapChip>
    ) : (
      <PlayerChip id={id}>{children}</PlayerChip>
    );
  }
  return kind === "map" ? <MapRow id={id} /> : <PlayerRow id={id} />;
}
