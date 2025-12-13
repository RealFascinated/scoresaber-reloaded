"use client";

import { downloadFile } from "@/common/browser-utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ElementType } from "react";

export default function PlaylistDownloadButton({
  name,
  url,
  icon: Icon,
}: {
  name: string;
  url: string;
  icon: ElementType;
}) {
  return (
    <Link href={url} onClick={e => e.preventDefault()}>
      <Button
        onClick={() => {
          downloadFile(url, `${name}.bplist`);
        }}
        className="flex items-center gap-2"
      >
        <Icon className="h-4 w-4" />
        {name}
      </Button>
    </Link>
  );
}
