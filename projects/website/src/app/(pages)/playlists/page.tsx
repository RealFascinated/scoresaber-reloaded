import Card from "@/components/card";
import PlaylistDownloadButton from "@/components/playlist/playlist-download-button";
import { Config } from "@ssr/common/config";

const playlists = [
  {
    name: "ScoreSaber Ranked Maps",
    id: "scoresaber-ranked-maps",
  },
  {
    name: "ScoreSaber Qualified Maps",
    id: "scoresaber-qualified-maps",
  },
];

export default function PlaylistPage() {
  return (
    <div className="flex w-full justify-center">
      <Card className="w-full h-fit w-full xl:max-w-[60%] gap-2">
        <div>
          <p>Playlists</p>
          <p className="text-gray-300">View our playlists we have!</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {playlists.map(playlist => (
            <div key={playlist.id}>
              <PlaylistDownloadButton name={playlist.name} url={`${Config.apiUrl}/playlist/${playlist.id}`} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
