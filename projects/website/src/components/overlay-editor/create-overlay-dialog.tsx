"use client";

import { cn } from "@/common/utils";
import OverlayPreview from "@/components/overlay-editor/overlay-preview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUserOverlayMutations } from "@/hooks/use-user-overlays";
import { OVERLAY_PRESETS } from "@ssr/common/overlay/overlay-presets";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type CreateOverlayDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Asks for a name and a starting point for a new overlay, then opens it in the editor.
 */
export default function CreateOverlayDialog({ open, onOpenChange }: CreateOverlayDialogProps) {
  const router = useRouter();
  const { create } = useUserOverlayMutations();
  const [name, setName] = useState("My overlay");
  const [presetId, setPresetId] = useState(OVERLAY_PRESETS[1]?.id ?? OVERLAY_PRESETS[0].id);

  const submit = () => {
    create.mutate(
      { name: name.trim(), presetId },
      {
        onSuccess: created => router.push(`/overlay/editor/${created.id}`),
        onError: error => toast.error(`Could not create the overlay: ${error.message}`),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>New overlay</DialogTitle>
          <DialogDescription>
            Pick a starting point, you can change everything in the editor.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {OVERLAY_PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              aria-pressed={preset.id === presetId}
              onClick={() => setPresetId(preset.id)}
              className={cn(
                "ring-border flex cursor-pointer flex-col gap-2 rounded-xl p-2 text-left ring-1 transition-colors",
                preset.id === presetId ? "ring-primary bg-primary/10 ring-2" : "hover:bg-hover"
              )}
            >
              <OverlayPreview layout={preset.layout} />
              <div className="px-1 pb-1">
                <div className="text-sm font-medium">{preset.name}</div>
                <div className="text-muted-foreground text-xs">{preset.description}</div>
              </div>
            </button>
          ))}
        </div>

        <form
          className="flex gap-2"
          onSubmit={event => {
            event.preventDefault();
            submit();
          }}
        >
          <Input
            value={name}
            maxLength={64}
            aria-label="Overlay name"
            placeholder="Overlay name"
            autoFocus
            onChange={event => setName(event.target.value)}
          />
          <Button type="submit" variant="primary" disabled={!name.trim() || create.isPending}>
            {create.isPending ? "Creating…" : "Create overlay"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
