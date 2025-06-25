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
  params: {
    type: string;
  };
};

export default async function MapsPage({ params }: MapsPageProps) {
  const { type } = await params;

  return (
    <main className="w-full">
      <MapsData type={type} />
    </main>
  );
}
