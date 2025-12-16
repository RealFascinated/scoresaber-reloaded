"use client";

import { getRankingColumnWidth } from "@/common/player-utils";
import { PlayerRanking } from "@/components/player/player-ranking";
import { PlayerPpDisplay } from "@/components/ranking/player-pp-display";
import SimplePagination from "@/components/simple-pagination";
import { useIsMobile } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { Page, Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { useCallback, useEffect, useState } from "react";
import Card from "../../card";
import { Spinner } from "../../spinner";

export function FriendRanking() {
  const isMobile = useIsMobile();
  const database = useDatabase();
  const friends = useStableLiveQuery(() => database.getFriends(true));

  const [page, setPage] = useState(1);
  const [friendsPage, setFriendsPage] = useState<Page<ScoreSaberPlayer>>();

  const getFriendsPage = useCallback(async () => {
    if (!friends) return;

    const pagination = new Pagination<ScoreSaberPlayer>();
    pagination.setItems(
      friends.sort((a, b) => {
        if (a.inactive && !b.inactive) return 1;
        if (!a.inactive && b.inactive) return -1;
        return b.pp - a.pp;
      })
    );
    pagination.setItemsPerPage(8);

    return pagination.getPage(page);
  }, [friends, page]);

  useEffect(() => {
    getFriendsPage().then(setFriendsPage);
  }, [getFriendsPage]);

  const firstColumnWidth = getRankingColumnWidth(
    friendsPage?.items ?? [],
    player => player.rank,
    player => player.countryRank
  );

  return (
    <Card className="flex h-fit flex-col">
      <div className="mb-(--spacing-lg)">
        <h2 className="text-lg font-semibold">Friend Ranking</h2>
        <p className="text-muted-foreground mt-(--spacing-xs) text-sm">
          See how your friends rank compared to each other.
        </p>
      </div>

      {/* Loading */}
      {!friendsPage && (
        <div className="flex w-full items-center justify-center py-(--spacing-2xl)">
          <Spinner />
        </div>
      )}

      {/* Scores */}
      {friendsPage && (
        <div className="flex flex-col gap-(--spacing-lg)">
          <div className="flex flex-col gap-2">
            {friendsPage.items.map(player => (
              <PlayerRanking
                key={player.id}
                player={player}
                getRank={player => player.rank}
                getCountryRank={player => player.countryRank}
                firstColumnWidth={firstColumnWidth}
                renderWorth={() => (
                  <PlayerPpDisplay
                    pp={player.pp}
                    className="ml-auto min-w-[70px]"
                    relativePerformancePoints={false}
                  />
                )}
              />
            ))}
          </div>

          <SimplePagination
            mobilePagination={isMobile}
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
