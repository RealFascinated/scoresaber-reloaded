import { Metadata } from "next";
import { MapsData } from "@/components/maps/maps-data";

export const metadata: Metadata = {
  title: "Maps",
  openGraph: {
    title: "ScoreSaber Reloaded - Maps",
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
  }>;
};

export default async function MapsPage({ searchParams }: MapsPageProps) {
  const { category } = await searchParams;
  return (
    <main className="w-full">
      <MapsData category={category} />
    </main>
  );
}
