import { isBackendUnavailableError } from "@/common/api-error";
import BackendUnavailable from "@/components/api/backend-unavailable";
import { PageTitle } from "@/components/page-title";
import { RankedBatchList } from "@/components/ranked-batch/ranked-batch-list";
import { RankedBatchPagination } from "@/components/ranked-batch/ranked-batch-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { env } from "@ssr/common/env";
import type { RankedBatchesPageResponse } from "@ssr/common/schemas/ranked-batch/ranked-batch-responses";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { ssrConfig } from "config";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createLoader, parseAsInteger, type SearchParams } from "nuqs/server";

export const revalidate = 300;

const MAX_PAGE = 10_000;

const TITLE = "Ranked Batches";
const DESCRIPTION = "Every time ScoreSaber re-rated a group of ranked maps, and how it moved player pp.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/ranked-batches",
  },
  openGraph: {
    siteName: env.NEXT_PUBLIC_WEBSITE_NAME ?? ssrConfig.siteName,
    title: TITLE,
    description: DESCRIPTION,
    images: ["/icon-512x512.png"],
  },
};

const loadRankedBatchesSearchParams = createLoader({ page: parseAsInteger.withDefault(1) });

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function RankedBatchesPage({ searchParams }: Props) {
  const { page: requestedPage } = loadRankedBatchesSearchParams(await searchParams);
  const page = Math.min(Math.max(1, requestedPage), MAX_PAGE);

  let rankedBatches: RankedBatchesPageResponse | undefined;
  try {
    rankedBatches = await ssrApi.getRankedBatches(page);
  } catch (error) {
    if (isBackendUnavailableError(error)) {
      return <BackendUnavailable />;
    }
    throw error;
  }

  if ((!rankedBatches || rankedBatches.items.length === 0) && (page > 1 || requestedPage !== 1)) {
    redirect("/ranked-batches");
  }

  return (
    <section className="flex w-full flex-col gap-4">
      <PageTitle title={TITLE} />

      {!rankedBatches || rankedBatches.items.length === 0 ? (
        <EmptyState
          className="rounded-xl ring-1 ring-border"
          title="No ranked batches found"
          description="There are no ranked batches on this page."
        />
      ) : (
        <>
          <RankedBatchList rankedBatches={rankedBatches.items} />
          <RankedBatchPagination
            page={page}
            totalItems={rankedBatches.metadata.totalItems}
            itemsPerPage={rankedBatches.metadata.itemsPerPage}
          />
        </>
      )}
    </section>
  );
}
