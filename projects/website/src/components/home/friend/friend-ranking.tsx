"use client";

import SimplePagination from "@/components/simple-pagination";
import useDatabase from "@/hooks/use-database";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Page, Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useState } from "react";
import Card from "../../card";
import { Spinner } from "../../spinner";
import { FriendRankingPlayer } from "./friend-ranking-player";

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

  return (
    <Card className="h-fit flex flex-col gap-2">
      <div>
        <p className="font-bold">Friend Ranking</p>
        <p className="text-sm text-gray-400">See how your friends rank compared to each other.</p>
      </div>

      {/* Loading */}
      {!friendsPage && (
        <div className="flex w-full justify-center items-center">
          <Spinner />
        </div>
      )}

      {/* Scores */}
      {friendsPage && (
        <div className="flex flex-col gap-2">
          <>
            <div className="divide-y divide-border">
              {friendsPage.items.map((player, index) => (
                <FriendRankingPlayer key={index} player={player} />
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
