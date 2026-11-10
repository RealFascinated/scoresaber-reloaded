"use client";

import Avatar from "@/components/avatar";
import SimpleLink from "@/components/simple-link";
import SimplePagination from "@/components/simple-pagination";
import { useFollowing } from "@/hooks/use-following";
import type { Page } from "@ssr/common/pagination";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { useCallback, useEffect, useState } from "react";
import Card from "../../card";
import { Spinner } from "../../spinner";

export function FollowingRanking() {
  const following = useFollowing(true).data;

  const [page, setPage] = useState(1);
  const [followingPage, setFollowingPage] = useState<Page<ScoreSaberPlayer>>();

  const getFollowingPage = useCallback(async () => {
    if (!following) {
      return;
    }

    const pagination = new Pagination<ScoreSaberPlayer>();
    pagination.setItems(
      following.toSorted((a, b) => {
        if (a.inactive && !b.inactive) {
          return 1;
        }
        if (!a.inactive && b.inactive) {
          return -1;
        }
        return b.pp - a.pp;
      })
    );
    pagination.setItemsPerPage(8);

    return pagination.getPage(page);
  }, [following, page]);

  useEffect(() => {
    getFollowingPage().then(setFollowingPage);
  }, [getFollowingPage]);

  return (
    <Card className="flex flex-col">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Following Ranking</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          See how the players you follow rank compared to each other.
        </p>
      </div>

      {!followingPage && (
        <div className="flex w-full items-center justify-center py-12">
          <Spinner />
        </div>
      )}

      {followingPage && (
        <div className="flex flex-col gap-3">
          {followingPage.items.map(player => (
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
            page={page}
            totalItems={followingPage.metadata.totalItems}
            itemsPerPage={followingPage.metadata.itemsPerPage}
            onPageChange={newPage => setPage(newPage)}
          />
        </div>
      )}
    </Card>
  );
}
