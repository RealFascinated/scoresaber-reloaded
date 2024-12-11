"use client";

import Link from "next/link";
import {Config} from "@ssr/common/config";
import useSettings from "@/hooks/use-settings";
import {RocketLaunchIcon} from "@heroicons/react/24/solid";
import Tooltip from "@/components/tooltip";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";

type SnipePlaylistDownloadButtonProps = {
  /**
   * The user who is being sniped
   */
  toSnipe: ScoreSaberPlayer;
};

export default function SnipePlaylistDownloadButton({ toSnipe }: SnipePlaylistDownloadButtonProps) {
  const settings = useSettings();
  if (!settings?.playerId) {
    return undefined;
  }

  return (
    <Link href={`${Config.apiUrl}/playlist/snipe?user=${settings.playerId}&toSnipe=${toSnipe.id}&download=true`} >
      <Tooltip display={<p>Download Snipe Playlist for {toSnipe.name}</p>} className="flex items-center" side="bottom">
        <button>
          <RocketLaunchIcon className="w-5 h-5" />
        </button>
      </Tooltip>
    </Link>
  );
}
