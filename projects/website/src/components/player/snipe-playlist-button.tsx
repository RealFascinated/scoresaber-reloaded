"use client";

import Link from "next/link";
import { Config } from "@ssr/common/config";
import useSettings from "@/hooks/use-settings";
import { RocketLaunchIcon } from "@heroicons/react/24/solid";
import Tooltip from "@/components/tooltip";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { Button } from "@/components/ui/button";

type SnipePlaylistDownloadButtonProps = {
  /**
   * The user who is being sniped
   */
  toSnipe: ScoreSaberPlayer;
};

const snipePlaylists = [
  {
    name: "Top",
    id: "top",
  },
  {
    name: "Recent",
    id: "recent",
  },
];

export default function SnipePlaylistDownloadButton({ toSnipe }: SnipePlaylistDownloadButtonProps) {
  const settings = useSettings();
  if (!settings?.playerId) {
    return undefined;
  }
  // <Link href={`${Config.apiUrl}/playlist/snipe?user=${settings.playerId}&toSnipe=${toSnipe.id}&download=true`} >

  return (
    <Tooltip
      display={
        <div className="flex flex-col gap-2">
          <p>
            Snipe Playlists for <span className="font-semibold">{toSnipe.name}</span>
          </p>

          <div className="flex gap-2 justify-center">
            {snipePlaylists.map(snipePlaylist => (
              <Link
                key={snipePlaylist.id}
                href={`${Config.apiUrl}/playlist/snipe?user=${settings.playerId}&toSnipe=${toSnipe.id}&type=${snipePlaylist.id}&download=true`}
              >
                <Button variant={"outline"} size={"sm"}>
                  {snipePlaylist.name}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      }
      className="flex items-center"
      side="bottom"
    >
      <button>
        <RocketLaunchIcon className="w-5 h-5" />
      </button>
    </Tooltip>
  );
}
