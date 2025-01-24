import Playlists from "@/components/maps/playlist/playlists";
import Leaderboards from "@/components/maps/category/leaderboards";
import { MapFilterProvider } from "@/components/providers/maps/map-filter-provider";
import MapFilters from "@/components/maps/map-filters";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
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
