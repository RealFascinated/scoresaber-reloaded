"use client";

import Avatar from "@/components/avatar";
import SimpleLink from "@/components/simple-link";
import SimplePagination from "@/components/simple-pagination";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import type { Page } from "@ssr/common/pagination";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { useCallback, useEffect, useState } from "react";
import Card from "../../card";
import { Spinner } from "../../spinner";

export function FriendRanking() {
  const database = useDatabase();
  const friends = useStableLiveQuery(() => database.getFriends(true));

  const [page, setPage] = useState(1);
  const [friendsPage, setFriendsPage] = useState<Page<ScoreSaberPlayer>>();

  const getFriendsPage = useCallback(async () => {
    if (!friends) {
      return;
    }

    const pagination = new Pagination<ScoreSaberPlayer>();
    pagination.setItems(
      friends.toSorted((a, b) => {
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
  }, [friends, page]);

  useEffect(() => {
    getFriendsPage().then(setFriendsPage);
  }, [getFriendsPage]);

  return (
    <Card className="flex flex-col">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Friend Ranking</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          See how your friends rank compared to each other.
        </p>
      </div>

      {!friendsPage && (
        <div className="flex w-full items-center justify-center py-12">
          <Spinner />
        </div>
      )}

      {friendsPage && (
        <div className="flex flex-col gap-3">
          {friendsPage.items.map(player => (
            <SimpleLink
              key={player.id}
              href={`/player/${player.id}`}
              className="flex items-center gap-4 rounded-xl bg-card ring-1 ring-border p-4 transition-colors hover:bg-muted/20"
            >
              <span className="font-mono text-sm font-semibold text-muted-foreground w-8 shrink-0 text-right">
                #{player.rank}
              </span>
              <Avatar
                src={player.avatar}
                alt={`${player.name}'s Profile Picture`}
                size={40}
                className="shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium truncate">{player.name}</span>
                <span className="text-xs text-muted-foreground">
                  #{formatNumberWithCommas(player.countryRank)} · {player.country}
                </span>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-primary">{formatPp(player.pp)}pp</p>
              </div>
            </SimpleLink>
          ))}

          <SimplePagination
            page={page}
            totalItems={friendsPage.metadata.totalItems}
            itemsPerPage={friendsPage.metadata.itemsPerPage}
            onPageChange={newPage => setPage(newPage)}
          />
        </div>
      )}
    </Card>
  );
}
