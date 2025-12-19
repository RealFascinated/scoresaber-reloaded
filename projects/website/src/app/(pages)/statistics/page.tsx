import { env } from "@ssr/common/env";
import { Metadata } from "next";
import StatisticData from "../../../components/statistic/statistic-data";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `SSR Statistics`,
    description: "View the statistics for SSR",
    openGraph: {
      siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
      title: `SSR Statistics`,
      description: "View the statistics for SSR",
    },
  };
}

export default async function StatisticsPage() {
  return <StatisticData />;
}
