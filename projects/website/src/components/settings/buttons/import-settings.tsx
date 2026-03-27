"use client";

import useDatabase from "@/hooks/use-database";
import { useRef, useState } from "react";
import { toast } from "sonner";
import SimpleTooltip from "../../simple-tooltip";
import { Button } from "../../ui/button";

export default function ImportSettings() {
  const database = useDatabase();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function importSettings(formData: FormData) {
    const settings = formData.get("settings");
    if (settings instanceof File) {
      setIsImporting(true);
      const applying = toast.loading("Applying settings…");
      try {
        const text = await settings.text();
        await database.importSettings(text);
        toast.dismiss(applying);
        toast.success("Settings imported successfully");
        window.location.reload();
      } catch {
        toast.dismiss(applying);
        toast.error("Failed to import settings", {
          description: "Database version mismatch",
        });
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
      }}
      className="w-fit"
    >
      <input
        type="file"
        name="settings"
        accept=".json"
        className="hidden"
        onChange={e => {
          if (e.target.files) {
            const formData = new FormData();
            formData.append("settings", e.target.files[0]);
            importSettings(formData);
          }
        }}
        ref={fileInputRef}
      />
      <SimpleTooltip display="This will import your settings from a file.">
        <Button
          variant="outline"
          type="button"
          disabled={isImporting}
          onClick={() => {
            fileInputRef.current?.click();
          }}
        >
          {isImporting ? "Importing…" : "Import"}
        </Button>
      </SimpleTooltip>
    </form>
  );
}
