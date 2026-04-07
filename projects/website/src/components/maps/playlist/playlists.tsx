import Card from "@/components/card";
import PlaylistDownloadButton from "@/components/maps/playlist/playlist-download-button";
import { env } from "@ssr/common/env";
import { CheckCircleIcon, ClockIcon, CrownIcon, FlameIcon, Star } from "lucide-react";
import { ElementType } from "react";
import { Button } from "../../ui/button";
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
  {
    name: "Trending",
    id: "scoresaber-trending",
    icon: FlameIcon,
  },
];

export default function Playlists() {
  return (
    <Card className="h-fit gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-foreground text-lg font-semibold">Playlists</h3>
        <p className="text-muted-foreground text-sm">Download ScoreSaber map playlists in one click.</p>
      </div>

      <div className="grid grid-cols-1 gap-2 2xl:grid-cols-2">
        {playlists.map(playlist => (
          <PlaylistDownloadButton
            key={playlist.id}
            name={playlist.name}
            url={`${env.NEXT_PUBLIC_API_URL}/playlist/${playlist.id}.bplist`}
            icon={playlist.icon}
          />
        ))}
        <CustomPlaylistCreator
          trigger={
            <Button className="flex items-center gap-2">
              <Star size={16} className="shrink-0" aria-hidden />
              Custom Playlist
            </Button>
          }
        />
      </div>
    </Card>
  );
}
