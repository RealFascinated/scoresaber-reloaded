import { isBackendUnavailableError } from "@/common/api-error";
import BackendUnavailable from "@/components/api/backend-unavailable";
import NotFound from "@/components/not-found";
import { PageTitle } from "@/components/page-title";
import { RankedBatchBreadcrumb } from "@/components/ranked-batch/ranked-batch-breadcrumb";
import { RankedBatchDownloadPlaylist } from "@/components/ranked-batch/ranked-batch-download-playlist";
import { formatRankedBatchDate, hasTrackedPpChanges } from "@/components/ranked-batch/ranked-batch-format";
import { RankedBatchLeaderboardsTable } from "@/components/ranked-batch/ranked-batch-leaderboards-table";
import { RankedBatchNewLeaderboardsTable } from "@/components/ranked-batch/ranked-batch-new-leaderboards-table";
import { RankedBatchPlayers } from "@/components/ranked-batch/ranked-batch-players";
import { env } from "@ssr/common/env";
import type {
  RankedBatchPlayersPageResponse,
  RankedBatchResponse,
} from "@ssr/common/schemas/ranked-batch/ranked-batch-responses";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { ssrConfig } from "config";
import { cache } from "react";

export const revalidate = 300;

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type RankedBatchFetchResult =
  | { status: "found"; response: RankedBatchResponse }
  | { status: "not-found" }
  | { status: "unavailable" };

const getRankedBatch = cache(async (id: string) => {
  const rankedBatchId = Number(id);
  if (!Number.isInteger(rankedBatchId) || rankedBatchId < 1) {
    const result: RankedBatchFetchResult = { status: "not-found" };
    return result;
  }
  try {
    const response = await ssrApi.getRankedBatch(rankedBatchId);
    const result: RankedBatchFetchResult =
      response === undefined ? { status: "not-found" } : { status: "found", response };
    return result;
  } catch (error) {
    if (isBackendUnavailableError(error)) {
      const result: RankedBatchFetchResult = { status: "unavailable" };
      return result;
    }
    throw error;
  }
});

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const result = await getRankedBatch(id);

  if (result.status === "unavailable") {
    return {
      title: "Backend Unavailable",
      description: "The backend is currently offline or unreachable. Please try again later.",
    };
  }
  if (result.status === "not-found") {
    return {
      title: "Unknown Ranked Batch",
      description: "The ranked batch you were looking for could not be found",
    };
  }

  const { rankedBatch } = result.response;
  const description = `${formatRankedBatchDate(rankedBatch)}: ${rankedBatch.newLeaderboardCount} maps were ranked and ${rankedBatch.leaderboardCount} maps were re-rated.`;
  return {
    title: rankedBatch.name,
    description,
    alternates: {
      canonical: `/ranked-batches/${rankedBatch.id}`,
    },
    openGraph: {
      siteName: env.NEXT_PUBLIC_WEBSITE_NAME ?? ssrConfig.siteName,
      title: rankedBatch.name,
      description,
      url: `${env.NEXT_PUBLIC_WEBSITE_URL ?? ssrConfig.siteUrl}/ranked-batches/${rankedBatch.id}`,
      images: ["/icon-512x512.png"],
    },
  };
}

export default async function RankedBatchPage({ params }: Props) {
  const { id } = await params;
  const result = await getRankedBatch(id);

  if (result.status === "unavailable") {
    return <BackendUnavailable />;
  }
  if (result.status === "not-found") {
    return (
      <NotFound
        title="Ranked Batch Not Found"
        description="The ranked batch you were looking for could not be found"
      />
    );
  }

  const { rankedBatch, leaderboards, newLeaderboards } = result.response;

  let gains: RankedBatchPlayersPageResponse | undefined;
  let losses: RankedBatchPlayersPageResponse | undefined;
  if (hasTrackedPpChanges(rankedBatch)) {
    try {
      [gains, losses] = await Promise.all([
        ssrApi.getRankedBatchPlayers(rankedBatch.id, 1, "gain"),
        ssrApi.getRankedBatchPlayers(rankedBatch.id, 1, "loss"),
      ]);
    } catch (error) {
      if (isBackendUnavailableError(error)) {
        return <BackendUnavailable />;
      }
      throw error;
    }
  }

  return (
    <section className="flex w-full flex-col gap-4">
      <RankedBatchBreadcrumb name={rankedBatch.name} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle title={rankedBatch.name} description={formatRankedBatchDate(rankedBatch)} />
        <RankedBatchDownloadPlaylist rankedBatchId={rankedBatch.id} />
      </div>

      {newLeaderboards.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Newly ranked ({newLeaderboards.length})</h2>
          <RankedBatchNewLeaderboardsTable leaderboards={newLeaderboards} />
        </div>
      )}

      {leaderboards.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Re-rated ({leaderboards.length})</h2>
          <RankedBatchLeaderboardsTable leaderboards={leaderboards} />
        </div>
      )}

      {gains && losses && (
        <div className="flex flex-col gap-4 lg:flex-row">
          <RankedBatchPlayers title="Biggest gains" players={gains.items} />
          <RankedBatchPlayers title="Biggest losses" players={losses.items} />
        </div>
      )}
    </section>
  );
}
