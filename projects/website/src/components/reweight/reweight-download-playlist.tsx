"use client";

import { downloadFile } from "@/common/browser-utils";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { SharedIcons } from "@/shared-icons";
import { env } from "@ssr/common/env";
import { useCallback, useState } from "react";

export function ReweightDownloadPlaylist({ reweightId }: { reweightId: number }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      await downloadFile(
        `${env.NEXT_PUBLIC_API_URL}/playlist/reweight/${reweightId}.bplist`,
        `ssr-reweight-${reweightId}.bplist`
      );
    } finally {
      setDownloading(false);
    }
  }, [reweightId]);

  return (
    <Button className="gap-2" disabled={downloading} onClick={handleDownload}>
      {downloading ? <Spinner className="size-4" /> : <SharedIcons.DownloadPlaylistIcon className="size-4" />}
      <span>Download Playlist</span>
    </Button>
  );
}
