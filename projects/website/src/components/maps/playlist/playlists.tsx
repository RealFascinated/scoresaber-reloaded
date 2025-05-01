import Card from "@/components/card";
import PlaylistDownloadButton from "@/components/maps/playlist/playlist-download-button";
import { env } from "@ssr/common/env";
import CustomPlaylistCreator from "./custom-playlist-creator";

type Playlist = {
  /**
   * The name of the playlist
   */
  name: string;

  /**
   * The id of the playlist
   */
  id: string;
};

const playlists: Playlist[] = [
  {
    name: "Ranked Maps",
    id: "scoresaber-ranked-maps",
  },
  {
    name: "Qualified Maps",
    id: "scoresaber-qualified-maps",
  },
  {
    name: "Ranking Queue",
    id: "scoresaber-ranking-queue-maps",
  },
];

export default function Playlists() {
  return (
    <Card className="h-fit gap-2">
      <div className="text-center">
        <p>Playlists</p>
        <p className="text-sm text-gray-300">Easily download maps from ScoreSaber.</p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {playlists.map(playlist => (
          <div key={playlist.id}>
            <PlaylistDownloadButton
              name={playlist.name}
              url={`${env.NEXT_PUBLIC_API_URL}/playlist/${playlist.id}.bplist?download=true`}
            />
          </div>
        ))}
        <CustomPlaylistCreator />
      </div>
    </Card>
  );
}
