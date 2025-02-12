import { MapsData } from "@/components/maps/maps-data";
import { env } from "@ssr/common/env";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maps",
  openGraph: {
    siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
    title: "Maps",
    description: "View the maps and playlists on ScoreSaber Reloaded",
  },
};

type MapsPageProps = {
  /**
   * The search params.
   */
  searchParams: Promise<{
    /**
     * The selected category.
     */
    category?: string;

    /**
     * The selected page.
     */
    page?: number;
  }>;
};

export default async function MapsPage({ searchParams }: MapsPageProps) {
  const { category, page } = await searchParams;

  return (
    <main className="w-full">
      <MapsData category={category} page={page} />
    </main>
  );
}
