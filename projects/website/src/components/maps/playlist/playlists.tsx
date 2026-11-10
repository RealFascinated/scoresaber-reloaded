"use client";

import { downloadFile } from "@/common/browser-utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SharedIcons } from "@/shared-icons";
import { env } from "@ssr/common/env";
import { Button } from "../../ui/button";
import CustomPlaylistCreator from "./custom-playlist-creator";

type Playlist = {
  name: string;

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
  {
    name: "Trending",
    id: "scoresaber-trending",
  },
];

const MENU_ITEM_CLASS =
  "hover:bg-accent flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors";

export default function Playlists() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SharedIcons.OneClickInstallIcon className="size-4" />
          Download playlist
          <SharedIcons.ExpandLeaderboardRowIcon className="text-muted-foreground size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-56 flex-col gap-0.5 p-1">
        {playlists.map(playlist => {
          const url = `${env.NEXT_PUBLIC_API_URL}/playlist/${playlist.id}.bplist`;
          return (
            <a
              key={playlist.id}
              href={url}
              className={MENU_ITEM_CLASS}
              onClick={e => {
                e.preventDefault();
                downloadFile(url, `${playlist.name}.bplist`);
              }}
            >
              {playlist.name}
            </a>
          );
        })}
        <div className="bg-border my-1 h-px" />
        <CustomPlaylistCreator
          trigger={
            <button type="button" className={MENU_ITEM_CLASS}>
              Custom playlist…
            </button>
          }
        />
      </PopoverContent>
    </Popover>
  );
}
