"use client";

import { downloadTextFile } from "@/common/browser-utils";
import useDatabase from "@/hooks/use-database";
import { useState } from "react";
import { toast } from "sonner";
import SimpleTooltip from "../../simple-tooltip";
import { Button } from "../../ui/button";

export default function ExportSettings() {
  const database = useDatabase();
  const [isExporting, setIsExporting] = useState(false);

  async function exportSettings() {
    setIsExporting(true);
    try {
      const settings = await database.exportSettings();
      downloadTextFile(settings, `ssr-settings-${new Date().toISOString()}.json`);
    } catch {
      toast.error("Failed to export settings");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <SimpleTooltip display="This will export your settings to a file.">
      <Button variant="outline" disabled={isExporting} onClick={exportSettings}>
        {isExporting ? "Exporting…" : "Export"}
      </Button>
    </SimpleTooltip>
  );
}
