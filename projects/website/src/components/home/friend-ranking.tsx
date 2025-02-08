"use client";

import { scoreAnimation } from "@/components/score/score-animation";
import useDatabase from "@/hooks/use-database";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Page, Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { useLiveQuery } from "dexie-react-hooks";
import { motion, useAnimation } from "framer-motion";
import { memo, useCallback, useEffect, useState } from "react";
import Card from "../card";
import PaginationComponent from "../input/pagination";
import { LoadingIcon } from "../loading-icon";
import { PlayerListItem } from "../player/player-list-item";

const MemoizedPagination = memo(PaginationComponent);

export function FriendRanking() {
  const database = useDatabase();
  const friends = useLiveQuery(async () => database.getFriends(true));

  const isMobile = useIsMobile();
  const controls = useAnimation();

  const [page, setPage] = useState(1);
  const [previousPage, setPreviousPage] = useState(1);
  const [friendsPage, setFriendsPage] = useState<Page<ScoreSaberPlayer>>();

  const getFriendsPage = useCallback(async () => {
    if (!friends) return;

    const pagination = new Pagination<ScoreSaberPlayer>();
    pagination.setItems(friends);
    pagination.setItemsPerPage(8);

    return pagination.getPage(page);
  }, [friends, page]);

  // Handle score animation
  const handleScoreAnimation = useCallback(async () => {
    await controls.start(previousPage >= page ? "hiddenRight" : "hiddenLeft");
    setFriendsPage(await getFriendsPage());
    await controls.start("visible");
  }, [controls, previousPage, page, getFriendsPage]);

  // Trigger animation when data changes
  useEffect(() => {
    if (friends) {
      handleScoreAnimation();
    }
  }, [friends, handleScoreAnimation]);

  return (
    <Card className="h-fit flex flex-col gap-2">
      <div>
        <p className="font-bold">Friend Ranking</p>
        <p className="text-sm text-gray-400">See how your friends rank compared to each other.</p>
      </div>

      {/* Loading */}
      {!friendsPage && (
        <div className="flex w-full justify-center items-center">
          <LoadingIcon />
        </div>
      )}

      {/* Scores */}
      {friendsPage && (
        <div className="flex flex-col gap-2">
          <>
            <motion.div
              initial="hidden"
              animate={controls}
              variants={scoreAnimation}
              className="divide-y divide-border"
            >
              {friendsPage.items.map((player, index) => (
                <PlayerListItem key={index} player={player} />
              ))}
            </motion.div>

            <MemoizedPagination
              mobilePagination={isMobile}
              page={page}
              totalItems={friendsPage.metadata.totalItems}
              itemsPerPage={friendsPage.metadata.itemsPerPage}
              onPageChange={newPage => {
                setPreviousPage(page);
                setPage(newPage);
              }}
            />
          </>
        </div>
      )}
    </Card>
  );
}
