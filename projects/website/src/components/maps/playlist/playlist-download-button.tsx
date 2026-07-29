"use client";

import { downloadFile } from "@/common/browser-utils";
import SimpleLink from "@/components/simple-link";
import { Button } from "@/components/ui/button";

export default function PlaylistDownloadButton({ name, url }: { name: string; url: string }) {
  return (
    <SimpleLink href={url} onClick={e => e.preventDefault()}>
      <Button
        onClick={() => {
          downloadFile(url, `${name}.bplist`);
        }}
        className="flex w-full items-center"
      >
        {name}
      </Button>
    </SimpleLink>
  );
}
