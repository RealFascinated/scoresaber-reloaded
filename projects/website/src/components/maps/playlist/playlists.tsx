import Card from "@/components/card";
import PlaylistDownloadButton from "@/components/maps/playlist/playlist-download-button";
import { env } from "@ssr/common/env";
import { CheckCircleIcon, ClockIcon, CrownIcon } from "lucide-react";
import { ElementType } from "react";
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

  /**
   * The icon of the playlist
   */
  icon: ElementType;
};

const playlists: Playlist[] = [
  {
    name: "Ranked Maps",
    id: "scoresaber-ranked-maps",
    icon: CrownIcon,
  },
  {
    name: "Qualified Maps",
    id: "scoresaber-qualified-maps",
    icon: CheckCircleIcon,
  },
  {
    name: "Ranking Queue",
    id: "scoresaber-ranking-queue-maps",
    icon: ClockIcon,
  },
];

export default function Playlists() {
  return (
    <Card className="h-fit gap-4">
      <div className="space-y-1">
        <h3 className="text-foreground text-lg font-semibold">Playlists</h3>
        <p className="text-muted-foreground text-sm">Easily download maps from ScoreSaber.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {playlists.map(playlist => (
          <PlaylistDownloadButton
            key={playlist.id}
            name={playlist.name}
            url={`${env.NEXT_PUBLIC_API_URL}/playlist/${playlist.id}.bplist?download=true`}
            icon={playlist.icon}
          />
        ))}
        <CustomPlaylistCreator />
      </div>
    </Card>
  );
}
