import MedalsData from "@/components/medals/medals-data";
import { env } from "@ssr/common/env";
import { ssrConfig } from "config";
import { Metadata } from "next";

export const revalidate = 300; // Revalidate every 5 minutes

export const metadata: Metadata = {
  title: "Medals Ranking",
  openGraph: {
    siteName: env.NEXT_PUBLIC_WEBSITE_NAME ?? ssrConfig.siteName,
    title: "Medals Ranking",
    description: "View the players with the most medals!",
    images: ["/icon-512x512.png"],
  },
};

export default async function MedalsPage() {
  return (
    <section className="flex w-full flex-col items-center text-sm">
      <MedalsData />
    </section>
  );
}
