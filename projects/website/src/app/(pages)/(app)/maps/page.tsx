import { Metadata } from "next";
import { MapsData } from "@/components/maps/maps-data";

export const metadata: Metadata = {
  title: "Maps",
  openGraph: {
    title: "ScoreSaber Reloaded - Maps",
    description: "View the maps and playlists on ScoreSaber Reloaded",
  },
};

export default function MapsPage() {
  return (
    <main className="w-full">
      <MapsData />
    </main>
  );
}
