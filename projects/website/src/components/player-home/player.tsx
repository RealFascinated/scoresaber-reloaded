"use client";

import { isBackendUnavailableError } from "@/common/api-error";
import BackendUnavailable from "@/components/api/backend-unavailable";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import PlayerPreviewHeader from "../player/header/player-preview-header";
import { Spinner } from "../spinner";

export function Player() {
  const database = useDatabase();
  const mainPlayerId = useStableLiveQuery(() => database.getMainPlayerId());

  const {
    data: player,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["player", mainPlayerId],
    queryFn: () => ssrApi.getScoreSaberPlayer(mainPlayerId!, "full"),
    // Fail fast so a backend outage surfaces as an error state instead of an
    // endless retry spinner (the provider default is infinite retries).
    retry: false,
    enabled: !!mainPlayerId,
  });

  const showBackendUnavailable = !player && isError && isBackendUnavailableError(error);

  if (showBackendUnavailable) {
    return <BackendUnavailable onRetry={() => refetch()} />;
  }

  return (
    <div>
      {isLoading && (
        <div className="flex h-full items-center justify-center py-12">
          <Spinner />
        </div>
      )}
      {player && <PlayerPreviewHeader player={player} />}
    </div>
  );
}
