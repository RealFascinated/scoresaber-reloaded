"use client";

import { Button } from "@/components/ui/button";
import { SharedIcons } from "@/shared-icons";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";

/**
 * The file a playlist tool returns. The model only sees the summary, the UI gets the contents.
 */
export type PlaylistFile = {
  title: string;
  songCount: number;
  fileName: string;
  bplist: object;
};

/**
 * Reads a playlist tool's output, or undefined when it isn't one.
 */
export function readPlaylistFile(output: object) {
  const candidate = output as Partial<PlaylistFile>;
  if (
    typeof candidate.title !== "string" ||
    typeof candidate.songCount !== "number" ||
    typeof candidate.fileName !== "string" ||
    typeof candidate.bplist !== "object" ||
    candidate.bplist === null
  ) {
    return undefined;
  }
  const file: PlaylistFile = {
    title: candidate.title,
    songCount: candidate.songCount,
    fileName: candidate.fileName,
    bplist: candidate.bplist,
  };
  return file;
}

function toBplistFileName(fileName: string) {
  const slug = fileName
    .replace(/\.bplist$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug === "" ? "playlist" : slug}.bplist`;
}

function downloadPlaylist(file: PlaylistFile) {
  const blob = new Blob([JSON.stringify(file.bplist)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = toBplistFileName(file.fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * A downloaded-in-the-browser card for a playlist a tool built, no file is stored on the server.
 */
export default function PlaylistFileCard({ file }: { file: PlaylistFile }) {
  return (
    <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-xs">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <SharedIcons.CustomPlaylistIcon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.title}</p>
        <p className="truncate text-xs text-muted-foreground tabular-nums">
          {formatNumberWithCommas(file.songCount)} songs · {toBplistFileName(file.fileName)}
        </p>
      </div>
      <Button size="sm" className="shrink-0 gap-1.5 rounded-full" onClick={() => downloadPlaylist(file)}>
        <SharedIcons.DownloadPlaylistIcon className="size-4" />
        <span>Download</span>
      </Button>
    </div>
  );
}
