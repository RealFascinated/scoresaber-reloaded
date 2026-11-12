import { isBackendUnavailableError } from "@/common/api-error";
import BackendUnavailable from "@/components/api/backend-unavailable";
import { PageTitle } from "@/components/page-title";
import { ReweightList } from "@/components/reweight/reweight-list";
import { ReweightPagination } from "@/components/reweight/reweight-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { env } from "@ssr/common/env";
import type { ReweightsPageResponse } from "@ssr/common/schemas/reweight/reweight-responses";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { ssrConfig } from "config";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createLoader, parseAsInteger, type SearchParams } from "nuqs/server";

export const revalidate = 300;

const MAX_PAGE = 10_000;

const TITLE = "Reweights";
const DESCRIPTION = "Every time ScoreSaber re-rated a group of ranked maps, and how it moved player pp.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/reweights",
  },
  openGraph: {
    siteName: env.NEXT_PUBLIC_WEBSITE_NAME ?? ssrConfig.siteName,
    title: TITLE,
    description: DESCRIPTION,
    images: ["/icon-512x512.png"],
  },
};

const loadReweightsSearchParams = createLoader({ page: parseAsInteger.withDefault(1) });

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function ReweightsPage({ searchParams }: Props) {
  const { page: requestedPage } = loadReweightsSearchParams(await searchParams);
  const page = Math.min(Math.max(1, requestedPage), MAX_PAGE);

  let reweights: ReweightsPageResponse | undefined;
  try {
    reweights = await ssrApi.getReweights(page);
  } catch (error) {
    if (isBackendUnavailableError(error)) {
      return <BackendUnavailable />;
    }
    throw error;
  }

  // A page past the last one (or a clamped invalid one) has nothing to show, so send the user back to the start.
  if ((!reweights || reweights.items.length === 0) && (page > 1 || requestedPage !== 1)) {
    redirect("/reweights");
  }

  return (
    <section className="flex w-full flex-col gap-4">
      <PageTitle title={TITLE} description={DESCRIPTION} />

      {!reweights || reweights.items.length === 0 ? (
        <EmptyState title="No reweights found" description="There are no reweights on this page." />
      ) : (
        <>
          <ReweightList reweights={reweights.items} />
          <ReweightPagination
            page={page}
            totalItems={reweights.metadata.totalItems}
            itemsPerPage={reweights.metadata.itemsPerPage}
          />
        </>
      )}
    </section>
  );
}
