"use client";

import { downloadFile } from "@/common/browser-utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
    <Link href={url} onClick={e => e.preventDefault()}>
      <Button
        onClick={() => {
          downloadFile(url, `${name}.bplist`);
        }}
      >
        {name}
      </Button>
    </Link>
  );
}
