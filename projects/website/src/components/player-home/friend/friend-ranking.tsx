"use client";

import { getPlayerRankingColumnWidth } from "@/common/player-utils";
import { PlayerRanking } from "@/components/ranking/player-ranking";
import SimplePagination from "@/components/simple-pagination";
import useDatabase from "@/hooks/use-database";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Page, Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "../../card";
import { Spinner } from "../../spinner";

export function FriendRanking() {
  const isMobile = useIsMobile();
  const database = useDatabase();
  const friends = useLiveQuery(async () => database.getFriends(true));

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

  const firstColumnWidth = useMemo(() => {
    return getPlayerRankingColumnWidth(friendsPage?.items ?? []);
  }, [friendsPage]);

  return (
    <Card className="flex h-fit flex-col gap-2">
      <div>
        <p className="font-bold">Friend Ranking</p>
        <p className="text-sm text-gray-400">See how your friends rank compared to each other.</p>
      </div>

      {/* Loading */}
      {!friendsPage && (
        <div className="flex w-full items-center justify-center">
          <Spinner />
        </div>
      )}

      {/* Scores */}
      {friendsPage && (
        <div className="flex flex-col gap-2">
          <>
            <div className="divide-border divide-y">
              {friendsPage.items.map((player, index) => (
                <PlayerRanking
                  key={player.id}
                  player={player}
                  relativePerformancePoints={false}
                  mainPlayer={friendsPage.items[0]}
                  firstColumnWidth={firstColumnWidth}
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
          </>
        </div>
      )}
    </Card>
  );
}
