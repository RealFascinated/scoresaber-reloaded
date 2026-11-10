"use client";

import Avatar from "@/components/avatar";
import SimpleLink from "@/components/simple-link";
import SimplePagination from "@/components/simple-pagination";
import { useFollowing } from "@/hooks/use-following";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { useState } from "react";
import Card from "../../card";
import { Spinner } from "../../spinner";

const ITEMS_PER_PAGE = 8;

export function FollowingRanking() {
  const { data: following, isLoading } = useFollowing(true);

  const [page, setPage] = useState(1);

  // Derived while rendering (not in an effect) so the server-rendered HTML already has the list
  const sortedFollowing = following.toSorted((a, b) => {
    if (a.inactive && !b.inactive) {
      return 1;
    }
    if (!a.inactive && b.inactive) {
      return -1;
    }
    return b.pp - a.pp;
  });
  const totalPages = Math.max(Math.ceil(sortedFollowing.length / ITEMS_PER_PAGE), 1);
  const currentPage = Math.min(page, totalPages);
  const pageItems = sortedFollowing.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <Card className="flex flex-col">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Following Ranking</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          See how the players you follow rank compared to each other.
        </p>
      </div>

      {isLoading && sortedFollowing.length === 0 ? (
        <div className="flex w-full items-center justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pageItems.map(player => (
            <SimpleLink
              key={player.id}
              href={`/player/${player.id}`}
              className="bg-card ring-border hover:bg-hover flex items-center gap-4 rounded-xl p-4 ring-1 transition-colors"
            >
              <span className="text-muted-foreground w-8 shrink-0 text-right text-sm font-semibold tabular-nums">
                #{player.rank}
              </span>
              <Avatar
                src={player.avatar}
                alt={`${player.name}'s Profile Picture`}
                size={40}
                className="shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{player.name}</span>
                <span className="text-muted-foreground text-xs">
                  #{formatNumberWithCommas(player.countryRank)} · {player.country}
                </span>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-primary text-sm font-semibold">{formatPp(player.pp)}pp</p>
              </div>
            </SimpleLink>
          ))}

          <SimplePagination
            page={currentPage}
            totalItems={sortedFollowing.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={newPage => setPage(newPage)}
          />
        </div>
      )}
    </Card>
  );
}
