"use client";

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
    <Link href={url} passHref>
      <Button>{name}</Button>
    </Link>
  );
}
