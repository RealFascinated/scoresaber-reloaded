import { isBackendUnavailableError } from "@/common/api-error";
import BackendUnavailable from "@/components/api/backend-unavailable";
import NotFound from "@/components/not-found";
import { PageTitle } from "@/components/page-title";
import { ReweightBreadcrumb } from "@/components/reweight/reweight-breadcrumb";
import { formatReweightDate, hasTrackedPpChanges } from "@/components/reweight/reweight-format";
import { ReweightLeaderboardsTable } from "@/components/reweight/reweight-leaderboards-table";
import { ReweightPlayers } from "@/components/reweight/reweight-players";
import { env } from "@ssr/common/env";
import type {
  ReweightPlayersPageResponse,
  ReweightResponse,
} from "@ssr/common/schemas/reweight/reweight-responses";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { ssrConfig } from "config";
import { Metadata } from "next";
import { cache } from "react";

export const revalidate = 300;

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type ReweightFetchResult =
  { status: "found"; response: ReweightResponse } | { status: "not-found" } | { status: "unavailable" };

const getReweight = cache(async (id: string): Promise<ReweightFetchResult> => {
  const reweightId = Number(id);
  if (!Number.isInteger(reweightId) || reweightId < 1) {
    return { status: "not-found" };
  }
  try {
    const response = await ssrApi.getReweight(reweightId);
    return response === undefined ? { status: "not-found" } : { status: "found", response };
  } catch (error) {
    if (isBackendUnavailableError(error)) {
      return { status: "unavailable" };
    }
    throw error;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await getReweight(id);

  if (result.status === "unavailable") {
    return {
      title: "Backend Unavailable",
      description: "The backend is currently offline or unreachable. Please try again later.",
    };
  }
  if (result.status === "not-found") {
    return { title: "Unknown Reweight", description: "The reweight you were looking for could not be found" };
  }

  const { reweight } = result.response;
  const description = `${formatReweightDate(reweight)}: ${reweight.leaderboardCount} maps were re-rated.`;
  return {
    title: reweight.name,
    description,
    alternates: {
      canonical: `/reweights/${reweight.id}`,
    },
    openGraph: {
      siteName: env.NEXT_PUBLIC_WEBSITE_NAME ?? ssrConfig.siteName,
      title: reweight.name,
      description,
      url: `${env.NEXT_PUBLIC_WEBSITE_URL ?? ssrConfig.siteUrl}/reweights/${reweight.id}`,
      images: ["/icon-512x512.png"],
    },
  };
}

export default async function ReweightPage({ params }: Props) {
  const { id } = await params;
  const result = await getReweight(id);

  if (result.status === "unavailable") {
    return <BackendUnavailable />;
  }
  if (result.status === "not-found") {
    return (
      <NotFound
        title="Reweight Not Found"
        description="The reweight you were looking for could not be found"
      />
    );
  }

  const { reweight, leaderboards } = result.response;

  let gains: ReweightPlayersPageResponse | undefined;
  let losses: ReweightPlayersPageResponse | undefined;
  if (hasTrackedPpChanges(reweight)) {
    try {
      [gains, losses] = await Promise.all([
        ssrApi.getReweightPlayers(reweight.id, 1, "gain"),
        ssrApi.getReweightPlayers(reweight.id, 1, "loss"),
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
      <ReweightBreadcrumb name={reweight.name} />

      <PageTitle title={reweight.name} description={formatReweightDate(reweight)} />

      <ReweightLeaderboardsTable leaderboards={leaderboards} />

      {gains && losses && (
        <div className="flex flex-col gap-4 lg:flex-row">
          <ReweightPlayers title="Biggest gains" players={gains.items} />
          <ReweightPlayers title="Biggest losses" players={losses.items} />
        </div>
      )}
    </section>
  );
}
