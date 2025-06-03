"use client";

import { downloadFile } from "@/common/browser-utils";
import { Button } from "@/components/ui/button";

type PlaylistDownloadButtonProps = {
  /**
   * The name of the playlist
   */
  name: string;

  /**
   * The url to download the playlist
   */
  url: string;
};

export default function PlaylistDownloadButton({ name, url }: PlaylistDownloadButtonProps) {
  return (
    <Button
      onClick={() => {
        downloadFile(url, `${name}.bplist`);
      }}
    >
      {name}
    </Button>
  );
}
