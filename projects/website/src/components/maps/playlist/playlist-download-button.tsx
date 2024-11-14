"use client";

import { Button } from "@/components/ui/button";
import { downloadFile } from "@/common/browser-utils";

type PlaylistDownloadButtonProps = {
  name: string;
  id: string;
  url: string;
};

export default function PlaylistDownloadButton({ name, id, url }: PlaylistDownloadButtonProps) {
  return <Button onClick={() => downloadFile(url, `${id}.json`)}>{name}</Button>;
}
