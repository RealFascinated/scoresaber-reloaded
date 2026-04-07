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
        className="flex w-full items-center gap-2"
      >
        <Icon className="hidden size-4 md:block" />
        {name}
      </Button>
    </SimpleLink>
  );
}
