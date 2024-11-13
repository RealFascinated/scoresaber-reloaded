"use client";

import { Button } from "@/components/ui/button";
import { downloadFile } from "@/common/browser-utils";

type PlaylistDownloadButtonProps = {
  name: string;
  url: string;
};

export default function PlaylistDownloadButton({ name, url }: PlaylistDownloadButtonProps) {
  return <Button onClick={() => downloadFile(url, `${name}.json`)}>{name}</Button>;
}
