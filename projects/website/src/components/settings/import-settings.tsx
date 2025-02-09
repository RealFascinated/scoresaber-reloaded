"use client";

import useDatabase from "@/hooks/use-database";
import { Button } from "../ui/button";
import { useRef } from "react";
import Tooltip from "../tooltip";
import { toast } from "sonner";
export default function ImportSettings() {
  const database = useDatabase();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function importSettings(formData: FormData) {
    const settings = formData.get("settings");
    if (settings instanceof File) {
      const text = await settings.text();
      try {
        await database.importSettings(text);
        toast("Settings imported successfully");
      } catch (error) {
        toast("Failed to import settings", {
          description: "Database version mismatch",
        });
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
      <Tooltip display="This will import your settings from a file.">
        <Button
          variant="outline"
          type="button"
          onClick={() => {
            fileInputRef.current?.click();
          }}
        >
          Import
        </Button>
      </Tooltip>
    </form>
  );
}
