"use client";

import { downloadTextFile } from "@/common/browser-utils";
import useDatabase from "@/hooks/use-database";
import SimpleTooltip from "../simple-tooltip";
import { Button } from "../ui/button";

export default function ExportSettings() {
  const database = useDatabase();

  async function exportSettings() {
    const settings = await database.exportSettings();
    downloadTextFile(settings, `ssr-settings-${new Date().toISOString()}.json`);
  }

  return (
    <SimpleTooltip display="This will export your settings to a file.">
      <Button variant="outline" onClick={exportSettings}>
        Export
      </Button>
    </SimpleTooltip>
  );
}
