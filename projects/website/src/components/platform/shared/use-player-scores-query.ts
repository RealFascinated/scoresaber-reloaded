"use client";

import { DEBOUNCE_MS_SEARCH } from "@/common/debounce";
import { usePageTransition } from "@/contexts/page-transition-context";
import type { SortDirection } from "@ssr/common/schemas/score/query/sort/sort-direction";
import { capitalizeFirstLetter } from "@ssr/common/string-utils";
import { useQuery } from "@tanstack/react-query";
import { useDebounce, useDocumentTitle } from "@uidotdev/usehooks";
import { ssrConfig } from "config";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { ReactNode, useCallback, useEffect } from "react";

export type SortOption<T extends string> = {
  name: string;
  value: T;
  icon: ReactNode;
  defaultOrder?: SortDirection;
};

export type PlayerScoresQueryState<T extends string> = {
  page: number;
  sort: T;
  direction: SortDirection;
  search: string | null;
  debouncedSearchTerm: string;
};

type UsePlayerScoresQueryOptions<T extends string, TData> = {
  /**
   * Stable prefix for the react-query key.
   */
  queryKeyPrefix: string;
  playerId: string;
  playerName: string;
  /**
   * Label shown in the document title, e.g. "ScoreSaber", "SSR", "Medals", "AccSaber".
   */
  titleLabel: string;
  defaultSort: T;
  sortOptions: SortOption<T>[];
  /**
   * Whether the tab supports a sort direction toggle.
   */
  hasDirection?: boolean;
  /**
   * Whether the tab has a search input.
   */
  hasSearch?: boolean;
  /**
   * Extra part shown in the document title (e.g. the AccSaber score type).
   */
  titleExtra?: string;
  /**
   * Whether to include the sort direction in the document title. Defaults to `hasDirection`.
   */
  showDirectionInTitle?: boolean;
  /**
   * Extra stable values included in the query key (e.g. the HMD filter or main player id).
   */
  extraKeyParts?: unknown[];
  queryFn: (params: { page: number; sort: T; direction: SortDirection; search?: string }) => Promise<TData>;
  buildUrl: (pageNum: number, state: PlayerScoresQueryState<T>) => string;
};

/**
 * Shared state, query and handler plumbing for the player platform score tabs.
 * Owns page/sort/direction/search URL query params, the debounced search term,
 * the document title, the react-query fetch and the page-transition loading state.
 */
export function usePlayerScoresQuery<T extends string, TData>({
  queryKeyPrefix,
  playerId,
  playerName,
  titleLabel,
  defaultSort,
  sortOptions,
  hasDirection = false,
  hasSearch = true,
  titleExtra,
  showDirectionInTitle = hasDirection,
  extraKeyParts = [],
  queryFn,
  buildUrl,
}: UsePlayerScoresQueryOptions<T, TData>) {
  const { animateLeft, animateRight, setIsLoading } = usePageTransition();

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [sort, setSort] = useQueryState("sort", parseAsString.withDefault(defaultSort)) as unknown as [
    T,
    (value: T | null) => void,
  ];
  const [direction, setDirection] = useQueryState(
    "direction",
    parseAsString.withDefault("desc")
  ) as unknown as [SortDirection, (value: SortDirection | null) => void];
  const [search, setSearch] = useQueryState("search", parseAsString);
  const debouncedSearchTerm = useDebounce(search || "", DEBOUNCE_MS_SEARCH);
  const invalidSearch = search !== null && search.length >= 1 && search.length < 3;

  const sortName = sortOptions.find(option => option.value === sort)?.name ?? capitalizeFirstLetter(sort);

  useDocumentTitle(
    ssrConfig.siteTitleTemplate.replace(
      "%s",
      [
        playerName,
        titleLabel,
        String(page),
        ...(titleExtra ? [titleExtra] : []),
        sortName,
        ...(showDirectionInTitle ? [capitalizeFirstLetter(direction)] : []),
      ].join(" / ")
    )
  );

  useEffect(() => {
    if (debouncedSearchTerm && debouncedSearchTerm.length >= 3) {
      setSearch(debouncedSearchTerm);
    } else if (debouncedSearchTerm === "") {
      setSearch(null);
    }
  }, [debouncedSearchTerm, setSearch]);

  const { data, isError, isLoading, isRefetching } = useQuery<TData>({
    queryKey: [
      queryKeyPrefix,
      playerId,
      page,
      sort,
      ...(hasDirection ? [direction] : []),
      debouncedSearchTerm,
      ...extraKeyParts,
    ],
    queryFn: async () =>
      queryFn({
        page,
        sort,
        direction,
        search: hasSearch && !invalidSearch ? debouncedSearchTerm : undefined,
      }),
    placeholderData: prev => prev,
  });

  useEffect(() => {
    setIsLoading(isLoading || isRefetching);
  }, [isLoading, isRefetching, data, setIsLoading]);

  const handleSortChange = useCallback(
    (newSort: T, defaultOrder: SortDirection = "desc") => {
      setIsLoading(true);
      if (newSort !== sort) {
        setSort(newSort);
        if (hasDirection) {
          setDirection(defaultOrder);
        }
        setPage(1);
        animateLeft();
      } else if (hasDirection) {
        setDirection(direction === "desc" ? "asc" : "desc");
        animateLeft();
      }
    },
    [sort, direction, hasDirection, setSort, setDirection, setPage, animateLeft, setIsLoading]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setIsLoading(true);
      if (newPage > page) {
        animateLeft();
      } else {
        animateRight();
      }
      setPage(newPage);
    },
    [page, animateLeft, animateRight, setIsLoading, setPage]
  );

  const handleSearchChange = useCallback(
    (newSearch: string) => {
      setSearch(newSearch);
      if (newSearch.length >= 3 || newSearch === "") {
        setIsLoading(true);
        setPage(1);
        animateLeft();
      }
    },
    [animateLeft, setIsLoading, setPage, setSearch]
  );

  /**
   * Resets to page 1 with a loading state + animation, then applies the filter change
   * (e.g. HMD filter or AccSaber score type).
   */
  const handleFilterChange = useCallback(
    (apply: () => void) => {
      setIsLoading(true);
      setPage(1);
      animateLeft();
      apply();
    },
    [setIsLoading, setPage, animateLeft]
  );

  const pageUrl = useCallback(
    (pageNum: number) => buildUrl(pageNum, { page, sort, direction, search, debouncedSearchTerm }),
    [buildUrl, page, sort, direction, search, debouncedSearchTerm]
  );

  return {
    page,
    sort,
    direction,
    search,
    setSearch,
    debouncedSearchTerm,
    invalidSearch,
    data,
    isError,
    isLoading,
    isRefetching,
    handleSortChange,
    handlePageChange,
    handleSearchChange,
    handleFilterChange,
    buildUrl: pageUrl,
  };
}
