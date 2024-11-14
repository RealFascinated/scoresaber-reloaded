import Playlists from "@/components/maps/playlist/playlists";
import Maps from "@/components/maps/maps";
import { MapFilterProvider } from "@/components/providers/maps/map-filter-provider";
import MapFilters from "@/components/maps/map-filters";

export default function MapsPage() {
  return (
    <main className="w-full">
      <MapFilterProvider>
        <div className="flex flex-col-reverse gap-2 w-full items-center xl:items-start xl:justify-center xl:flex-row">
          <article className="w-full 2xl:w-[900px] flex flex-col gap-2">
            <Maps />
          </article>
          <div className="w-full xl:w-[400px] flex flex-col gap-2">
            <Playlists />
            <MapFilters />
          </div>
        </div>
      </MapFilterProvider>
    </main>
  );
}
