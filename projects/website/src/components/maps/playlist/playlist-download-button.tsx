"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

type PlaylistDownloadButtonProps = {
  name: string;
  url: string;
};

export default function PlaylistDownloadButton({ name, url }: PlaylistDownloadButtonProps) {
  return (
    <Link href={url} passHref>
      <Button>{name}</Button>
    </Link>
  );
}
