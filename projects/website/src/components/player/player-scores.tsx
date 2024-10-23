import { capitalizeFirstLetter } from "@/common/string-utils";
import useWindowDimensions from "@/hooks/use-window-dimensions";
import { ClockIcon, TrophyIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { motion, useAnimation } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import Card from "../card";
import Pagination from "../input/pagination";
import { Button } from "../ui/button";
import Score from "@/components/score/score";
import { Input } from "@/components/ui/input";
import { clsx } from "clsx";
import { useDebounce } from "@uidotdev/usehooks";
import { scoreAnimation } from "@/components/score/score-animation";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSort } from "@ssr/common/score/score-sort";
import { setCookieValue } from "@ssr/common/utils/cookie-utils";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import { fetchPlayerScores } from "@ssr/common/utils/score-utils";
import PlayerScoresResponse from "@ssr/common/response/player-scores-response";

type Props = {
  initialScoreData?: PlayerScoresResponse<ScoreSaberScore, ScoreSaberLeaderboard>;
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

export default function PlayerScores({ initialScoreData, initialSearch, player, sort, page }: Props) {
  const { width } = useWindowDimensions();
  const controls = useAnimation();

  const [pageState, setPageState] = useState<PageState>({ page, sort });
  const [previousPage, setPreviousPage] = useState(page);
  const [scores, setScores] = useState<PlayerScoresResponse<ScoreSaberScore, ScoreSaberLeaderboard> | undefined>(
    initialScoreData
  );
  const [searchTerm, setSearchTerm] = useState(initialSearch || "");
  const debouncedSearchTerm = useDebounce(searchTerm, 250);
  const [shouldFetch, setShouldFetch] = useState(false);
  const topOfScoresRef = useRef<HTMLDivElement>(null);

  const isSearchActive = debouncedSearchTerm.length >= 3;
  const { data, isError, isLoading } = useQuery({
    queryKey: ["playerScores", player.id, pageState, debouncedSearchTerm],
    queryFn: () =>
      fetchPlayerScores<ScoreSaberScore, ScoreSaberLeaderboard>(
        "scoresaber",
        player.id,
        pageState.page,
        pageState.sort,
        debouncedSearchTerm
      ),
    enabled: shouldFetch && (debouncedSearchTerm.length >= 3 || debouncedSearchTerm.length === 0),
  });

  /**
   * Starts the animation for the scores.
   */
  const handleScoreAnimation = useCallback(async () => {
    await controls.start(previousPage >= pageState.page ? "hiddenRight" : "hiddenLeft");
    setScores(data);
    await controls.start("visible");
  }, [controls, previousPage, pageState.page, data]);

  /**
   * Change the score sort.
   *
   * @param newSort the new sort
   */
  const handleSortChange = async (newSort: ScoreSort) => {
    if (newSort !== pageState.sort) {
      setPageState({ page: 1, sort: newSort });
      setShouldFetch(true); // Set to true to trigger fetch
      await setCookieValue("lastScoreSort", newSort); // Set the default score sort
    }
  };

  /**
   * Change the score search term.
   *
   * @param query the new search term
   */
  const handleSearchChange = (query: string) => {
    setSearchTerm(query);
    if (query.length >= 3) {
      setShouldFetch(true); // Set to true to trigger fetch
    } else {
      setShouldFetch(false); // Disable fetch if the search query is less than 3 characters
    }
  };

  /**
   * Clears the score search term.
   */
  const clearSearch = () => {
    setSearchTerm("");
  };

  /**
   * Handle score animation.
   */
  useEffect(() => {
    if (data) {
      handleScoreAnimation();
    }
  }, [data, handleScoreAnimation]);

  /**
   * Gets the URL to the page.
   */
  const getUrl = useCallback(
    (page: number) => {
      return `/player/${player.id}/${pageState.sort}/${page}${isSearchActive ? `?search=${debouncedSearchTerm}` : ""}`;
    },
    [debouncedSearchTerm, player.id, pageState.sort, isSearchActive]
  );

  /**
   * Handle updating the URL when the page number,
   * sort, or search term changes.
   */
  useEffect(() => {
    const newUrl = getUrl(pageState.page);
    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
  }, [pageState, debouncedSearchTerm, player.id, isSearchActive, getUrl]);

  /**k
   * Handle scrolling to the top of the
   * scores when new scores are loaded.
   */
  useEffect(() => {
    if (topOfScoresRef.current && shouldFetch) {
      const topOfScoresPosition = topOfScoresRef.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: topOfScoresPosition - 55, // Navbar height (plus some padding)
        behavior: "smooth",
      });
    }
  }, [pageState, topOfScoresRef, shouldFetch]);

  const invalidSearch = searchTerm.length >= 1 && searchTerm.length < 3;
  return (
    <Card className="flex gap-1">
      <div className="flex flex-col items-center w-full gap-2 relative">
        {/* Where to scroll to when new scores are loaded */}
        <div ref={topOfScoresRef} className="absolute" />

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
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:brightness-[66%] transform-gpu transition-all cursor-default"
              aria-label="Clear search"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {scores !== undefined && (
        <>
          <div className="text-center">
            {isError || (scores.scores.length === 0 && <p>No scores found. Invalid Page or Search?</p>)}
          </div>

          <motion.div
            initial="hidden"
            animate={controls}
            variants={scoreAnimation}
            className="grid min-w-full grid-cols-1 divide-y divide-border"
          >
            {scores.scores.map((score, index) => (
              <motion.div key={index} variants={scoreAnimation}>
                <Score score={score.score} leaderboard={score.leaderboard} beatSaverMap={score.beatSaver} />
              </motion.div>
            ))}
          </motion.div>

          {scores.metadata.totalPages > 1 && (
            <Pagination
              mobilePagination={width < 768}
              page={pageState.page}
              totalPages={scores.metadata.totalPages}
              loadingPage={isLoading ? pageState.page : undefined}
              generatePageUrl={page => {
                return getUrl(page);
              }}
              onPageChange={newPage => {
                setPreviousPage(pageState.page);
                setPageState({ ...pageState, page: newPage });
                setShouldFetch(true); // Set to true to trigger fetch on page change
              }}
            />
          )}
        </>
      )}
    </Card>
  );
}
