"use client";

import { capitalizeFirstLetter } from "@/common/string-utils";
import useWindowDimensions from "@/hooks/use-window-dimensions";
import { ClockIcon, TrophyIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { motion, useAnimation, Variants } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import Card from "../card";
import Pagination from "../input/pagination";
import { Button } from "../ui/button";
import { ScoreSort } from "@/common/service/score-sort";
import ScoreSaberPlayerScoresPageToken from "@/common/model/token/scoresaber/score-saber-player-scores-page-token";
import Score from "@/components/score/score";
import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";
import { scoresaberService } from "@/common/service/impl/scoresaber";

type Props = {
  initialScoreData?: ScoreSaberPlayerScoresPageToken;
  player: ScoreSaberPlayer;
  sort: ScoreSort;
  page: number;
};

type PageState = {
  /**
   * The current page
   */
  page: number;

  /**
   * The current sort
   */
  sort: ScoreSort;
};

const scoreSort = [
  {
    name: "Top",
    value: ScoreSort.top,
    icon: <TrophyIcon className="w-5 h-5" />,
  },
  {
    name: "Recent",
    value: ScoreSort.recent,
    icon: <ClockIcon className="w-5 h-5" />,
  },
];

const scoreAnimation: Variants = {
  hiddenRight: {
    opacity: 0,
    x: 50,
    transition: {
      delay: 0,
    },
  },
  hiddenLeft: {
    opacity: 0,
    x: -50,
    transition: {
      delay: 0,
    },
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

export default function PlayerScores({
  initialScoreData,
  player,
  sort,
  page,
}: Props) {
  const { width } = useWindowDimensions();
  const controls = useAnimation();

  const [firstLoad, setFirstLoad] = useState(true);
  const [pageState, setPageState] = useState<PageState>({
    page: page,
    sort: sort,
  });
  const [previousPage, setPreviousPage] = useState(page);
  const [currentScores, setCurrentScores] = useState<
    ScoreSaberPlayerScoresPageToken | undefined
  >(initialScoreData);

  const {
    data: scores,
    isError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["playerScores", player.id, pageState],
    queryFn: () =>
      scoresaberService.lookupPlayerScores({
        playerId: player.id,
        sort: pageState.sort,
        page: pageState.page,
      }),
    staleTime: 30 * 1000, // Cache data for 30 seconds
  });

  const handleScoreLoad = useCallback(async () => {
    setFirstLoad(false);
    if (!firstLoad) {
      await controls.start(
        previousPage >= pageState.page ? "hiddenRight" : "hiddenLeft",
      );
    }
    setCurrentScores(scores);
    await controls.start("visible");
  }, [scores, controls, previousPage, firstLoad, pageState.page]);

  const handleSortChange = (newSort: ScoreSort) => {
    if (newSort !== pageState.sort) {
      setPageState({ page: 1, sort: newSort });
    }
  };

  useEffect(() => {
    if (scores) {
      handleScoreLoad();
    }
  }, [scores, isError, handleScoreLoad]);

  useEffect(() => {
    const newUrl = `/player/${player.id}/${pageState.sort}/${pageState.page}`;
    window.history.replaceState(
      { ...window.history.state, as: newUrl, url: newUrl },
      "",
      newUrl,
    );
    refetch();
  }, [pageState, refetch, player.id]);

  return (
    <Card className="flex gap-1">
      <div className="flex items-center flex-col w-full gap-2 justify-center relative">
        <div className="flex items-center flex-row gap-2">
          {Object.values(scoreSort).map((sortOption, index) => (
            <Button
              variant={
                sortOption.value === pageState.sort ? "default" : "outline"
              }
              key={index}
              onClick={() => handleSortChange(sortOption.value)}
              size="sm"
              className="flex items-center gap-1"
            >
              {sortOption.icon}
              {`${capitalizeFirstLetter(sortOption.name)} Scores`}
            </Button>
          ))}
        </div>

        {/* todo: add search */}
        {/*<Input*/}
        {/*  type="search"*/}
        {/*  placeholder="Search..."*/}
        {/*  className="w-72 flex lg:absolute right-0 top-0"*/}
        {/*/>*/}
      </div>

      {currentScores && (
        <>
          <div className="text-center">
            {isError && <p>Oopsies! Something went wrong.</p>}
            {currentScores.playerScores.length === 0 && (
              <p>No scores found. Invalid Page?</p>
            )}
          </div>

          <motion.div
            initial="hidden"
            animate={controls}
            variants={scoreAnimation}
            className="grid min-w-full grid-cols-1 divide-y divide-border"
          >
            {currentScores.playerScores.map((playerScore, index) => (
              <motion.div key={index} variants={scoreAnimation}>
                <Score playerScore={playerScore} />
              </motion.div>
            ))}
          </motion.div>

          <Pagination
            mobilePagination={width < 768}
            page={pageState.page}
            totalPages={Math.ceil(
              currentScores.metadata.total /
                currentScores.metadata.itemsPerPage,
            )}
            loadingPage={isLoading ? pageState.page : undefined}
            onPageChange={(page) => {
              setPreviousPage(pageState.page);
              setPageState({ page, sort: pageState.sort });
            }}
          />
        </>
      )}
    </Card>
  );
}
