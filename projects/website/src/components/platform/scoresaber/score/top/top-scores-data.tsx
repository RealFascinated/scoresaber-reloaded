"use client";

import { isBackendUnavailableError } from "@/common/api-error";
import BackendUnavailable from "@/components/api/backend-unavailable";
import Avatar from "@/components/avatar";
import { PageTitle } from "@/components/page-title";
import { useRealm } from "@/components/providers/realm-provider";
import SimpleLink from "@/components/simple-link";
import SimplePagination from "@/components/simple-pagination";
import { Spinner } from "@/components/spinner";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import ScoreSaberScoreDisplay from "../scoresaber-score";
import { topScoresSearchParams, type TopScoresInitialData } from "./top-scores-query";

type TopScoresDataProps = {
  /** Top scores rendered on the server, used until the client has data of its own. */
  initial?: TopScoresInitialData;
};

export function TopScoresData({ initial }: TopScoresDataProps) {
  const { realmId } = useRealm();
  const isDefaultRealm = realmId === DEFAULT_REALM_ID;
  const [page, setPage] = useQueryState("page", topScoresSearchParams.page);

  // The server only renders the default realm, and its data is only valid for the page it was fetched for
  const initialData = initial && isDefaultRealm && initial.page === page ? initial.data : undefined;

  const {
    data: scores,
    isLoading,
    isRefetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["top-scores", page, realmId],
    queryFn: () => ssrApi.fetchTopScores(page, realmId),
    initialData,
    initialDataUpdatedAt: initial?.fetchedAt,
    // Fail fast so a backend outage surfaces as an error state instead of an
    // endless retry spinner (the provider default is infinite retries).
    retry: false,
    refetchInterval: false,
    // Don't carry the server's default realm data over to a realm it wasn't rendered for
    placeholderData: (previous, previousQuery) =>
      previousQuery?.options.initialData !== undefined && !isDefaultRealm ? undefined : previous,
  });

  const showBackendUnavailable = !scores && isError && isBackendUnavailableError(error);

  if (showBackendUnavailable) {
    return <BackendUnavailable onRetry={() => refetch()} />;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <PageTitle title="Top Scores" description="Discover the highest scores tracked across ScoreSaber" />

      {isLoading || !scores ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* One surface with dividers instead of a card per score, so the list reads as a list */}
          <div className="ring-border bg-card divide-border divide-y overflow-hidden rounded-xl ring-1">
            {scores.items.map(({ score, leaderboard, beatSaver }) => {
              const player = score.playerInfo;
              if (!player) {
                return null;
              }

              return (
                <div key={score.scoreId}>
                  <div className="flex items-center gap-2 px-4 pt-3">
                    <Avatar
                      src={player.avatar}
                      alt={`${player.name}'s Profile Picture`}
                      size={20}
                      className="shrink-0"
                    />
                    <SimpleLink
                      href={`/player/${player.id}`}
                      className="hover:text-primary text-sm font-medium transition-colors"
                    >
                      {player.name}
                    </SimpleLink>
                    {score.rank > 0 && (
                      <span className="text-muted-foreground ml-auto text-xs">
                        #{score.rank.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <ScoreSaberScoreDisplay
                    score={score}
                    leaderboard={leaderboard}
                    beatSaverMap={beatSaver}
                    settings={{
                      hideAccuracyChanger: true,
                      hideDetailsDropdown: true,
                    }}
                  />
                </div>
              );
            })}
          </div>

          <SimplePagination
            page={page}
            totalItems={scores.metadata.totalItems}
            itemsPerPage={scores.metadata.itemsPerPage}
            loadingPage={isLoading || isRefetching ? page : undefined}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
