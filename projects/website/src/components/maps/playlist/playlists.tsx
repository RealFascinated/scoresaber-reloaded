import PlaylistDownloadButton from "@/components/maps/playlist/playlist-download-button";
import { Config } from "@ssr/common/config";
import Card from "@/components/card";

const playlists = [
  {
    name: "All Ranked Maps",
    id: "scoresaber-ranked-maps",
  },
  {
    name: "All Qualified Maps",
    id: "scoresaber-qualified-maps",
  },
  {
    name: "Maps in Ranking Queue",
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
              id={playlist.id}
              url={`${Config.apiUrl}/playlist/${playlist.id}`}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
