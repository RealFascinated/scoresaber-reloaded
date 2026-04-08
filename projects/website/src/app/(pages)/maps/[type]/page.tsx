import { MapsData } from "@/components/maps/maps-data";
import { env } from "@ssr/common/env";
import { Metadata } from "next";

type MapsPageProps = {
  params: Promise<{
    type: string;
  }>;
};

const mapTypeMetadata: Record<string, { title: string; description: string }> = {
  leaderboards: {
    title: "Maps / Leaderboards",
    description: "Browse ScoreSaber leaderboards with filters for trending, stars, ranked status, and more.",
  },
  "ranking-queue": {
    title: "Maps / Ranking Queue",
    description: "View ScoreSaber ranking queue requests and discover maps currently up for rank or unrank.",
  },
};

export async function generateMetadata({ params }: MapsPageProps): Promise<Metadata> {
  const { type } = await params;
  const metadataForType = mapTypeMetadata[type] ?? {
    title: "Maps",
    description: "View the maps and playlists on ScoreSaber Reloaded.",
  };

  return {
    title: metadataForType.title,
    description: metadataForType.description,
    alternates: {
      canonical: `/maps/${type}`,
    },
    openGraph: {
      siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
      title: metadataForType.title,
      description: metadataForType.description,
      url: `${env.NEXT_PUBLIC_WEBSITE_URL}/maps/${type}`,
    },
  };
}

export default async function MapsPage({ params }: MapsPageProps) {
  const { type } = await params;

  return (
    <main className="w-full">
      <MapsData type={type} />
    </main>
  );
}
