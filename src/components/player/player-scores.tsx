import { capitalizeFirstLetter } from "@/common/string-utils";
import useWindowDimensions from "@/hooks/use-window-dimensions";
import { ClockIcon, TrophyIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { motion, useAnimation, Variants } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import Card from "../card";
import Pagination from "../input/pagination";
import { Button } from "../ui/button";
import { ScoreSort } from "@/common/model/score/score-sort";
import ScoreSaberPlayerScoresPageToken from "@/common/model/token/scoresaber/score-saber-player-scores-page-token";
import Score from "@/components/score/score";
import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";
import { scoresaberService } from "@/common/service/impl/scoresaber";
import { Input } from "@/components/ui/input";
import { clsx } from "clsx";
import { useDebounce } from "@uidotdev/usehooks";

type Props = {
  initialScoreData?: ScoreSaberPlayerScoresPageToken;
  initialSearch?: string;
  player: ScoreSaberPlayer;
  sort: ScoreSort;
  page: number;
};

type PageState = {
  page: number;
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
  hiddenRight: { opacity: 0, x: 50 },
  hiddenLeft: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { staggerChildren: 0.03 } },
};

export default function PlayerScores({ initialScoreData, initialSearch, player, sort, page }: Props) {
  const { width } = useWindowDimensions();
  const controls = useAnimation();

  const [pageState, setPageState] = useState<PageState>({ page, sort });
  const [previousPage, setPreviousPage] = useState(page);
  const [currentScores, setCurrentScores] = useState<ScoreSaberPlayerScoresPageToken | undefined>(initialScoreData);
  const [searchTerm, setSearchTerm] = useState(initialSearch || "");
  const debouncedSearchTerm = useDebounce(searchTerm, 250);

  const isSearchActive = debouncedSearchTerm.length >= 3;
  const [shouldFetch, setShouldFetch] = useState(false); // New state to control fetching

  const {
    data: scores,
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["playerScores", player.id, pageState, debouncedSearchTerm],
    queryFn: () => {
      return scoresaberService.lookupPlayerScores({
        playerId: player.id,
        page: pageState.page,
        sort: pageState.sort,
        ...(isSearchActive && { search: debouncedSearchTerm }),
      });
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled: shouldFetch && (debouncedSearchTerm.length >= 3 || debouncedSearchTerm.length === 0), // Only enable if we set shouldFetch to true
  });

  const handleScoreLoad = useCallback(async () => {
    await controls.start(previousPage >= pageState.page ? "hiddenRight" : "hiddenLeft");
    setCurrentScores(scores);
    await controls.start("visible");
  }, [scores, controls, previousPage, pageState.page]);

  const handleSortChange = (newSort: ScoreSort) => {
    if (newSort !== pageState.sort) {
      setPageState({ page: 1, sort: newSort });
      setShouldFetch(true); // Set to true to trigger fetch
    }
  };

  useEffect(() => {
    if (scores) handleScoreLoad();
  }, [scores, handleScoreLoad]);

  useEffect(() => {
    const newUrl = `/player/${player.id}/${pageState.sort}/${pageState.page}${isSearchActive ? `?search=${debouncedSearchTerm}` : ""}`;
    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
  }, [pageState, debouncedSearchTerm, player.id, isSearchActive]);

  const handleSearchChange = (query: string) => {
    setSearchTerm(query);
    if (query.length >= 3) {
      setShouldFetch(true); // Set to true to trigger fetch
    } else {
      setShouldFetch(false); // Disable fetch if the search query is less than 3 characters
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  const invalidSearch = searchTerm.length >= 1 && searchTerm.length < 3;
  return (
    <Card className="flex gap-1">
      <div className="flex flex-col items-center w-full gap-2 relative">
        <div className="flex gap-2">
          {scoreSort.map(sortOption => (
            <Button
              key={sortOption.value}
              variant={sortOption.value === pageState.sort ? "default" : "outline"}
              onClick={() => handleSortChange(sortOption.value)}
              size="sm"
              className="flex items-center gap-1"
            >
              {sortOption.icon}
              {`${capitalizeFirstLetter(sortOption.name)} Scores`}
            </Button>
          ))}
        </div>

        <div className="relative w-72 lg:absolute right-0 top-0">
          <Input
            type="search"
            placeholder="Search..."
            className={clsx(
              "pr-10", // Add padding right for the clear button
              invalidSearch && "border-red-500"
            )}
            value={searchTerm}
            onChange={e => handleSearchChange(e.target.value)}
          />
          {searchTerm && ( // Show clear button only if there's a query
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:brightness-75 transform-gpu transition-all cursor-default"
              aria-label="Clear search"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {currentScores && (
        <>
          <div className="text-center">
            {isError || (currentScores.playerScores.length === 0 && <p>No scores found. Invalid Page or Search?</p>)}
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
            totalPages={Math.ceil(currentScores.metadata.total / currentScores.metadata.itemsPerPage)}
            loadingPage={isLoading ? pageState.page : undefined}
            onPageChange={newPage => {
              setPreviousPage(pageState.page);
              setPageState({ ...pageState, page: newPage });
              setShouldFetch(true); // Set to true to trigger fetch on page change
            }}
          />
        </>
      )}
    </Card>
  );
}
