"use client";

import { downloadFile } from "@/common/browser-utils";
import SimpleLink from "@/components/simple-link";
import { Button } from "@/components/ui/button";
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
    <SimpleLink href={url} onClick={e => e.preventDefault()}>
      <Button
        onClick={() => {
          downloadFile(url, `${name}.bplist`);
        }}
        className="flex items-center gap-2"
      >
        <Icon className="h-4 w-4 hidden md:block" />
        {name}
      </Button>
    </SimpleLink>
  );
}
