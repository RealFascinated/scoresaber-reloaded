"use client";

import CreateOverlayDialog from "@/components/overlay-editor/create-overlay-dialog";
import { Button } from "@/components/ui/button";
import { useUserOverlayMutations, useUserOverlays } from "@/hooks/use-user-overlays";
import { MAX_USER_OVERLAYS, type UserOverlaySummary } from "@ssr/common/schemas/response/user/overlay";
import { timeAgo } from "@ssr/common/utils/time-utils";
import { Copy, Link2, Monitor, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

function OverlayCard({ overlay, atLimit }: { overlay: UserOverlaySummary; atLimit: boolean }) {
  const { duplicate, remove } = useUserOverlayMutations();

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/overlay?id=${overlay.id}`);
      toast.success("Copied the OBS browser source URL");
    } catch (error) {
      console.error("Failed to copy the URL", error);
      toast.error("Could not copy the URL");
    }
  };

  return (
    <div className="ring-border bg-card flex flex-col gap-4 rounded-xl p-4 ring-1">
      <Link href={`/overlay/editor/${overlay.id}`} className="group flex items-center gap-3">
        <div className="bg-muted text-muted-foreground group-hover:text-foreground flex size-12 shrink-0 items-center justify-center rounded-lg transition-colors">
          <Monitor className="size-6" />
        </div>
        <div className="min-w-0">
          <div className="group-hover:text-primary truncate font-semibold transition-colors">
            {overlay.name}
          </div>
          <div className="text-muted-foreground text-xs">
            Edited {timeAgo(new Date(overlay.updatedAt), 1)}
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="primary" className="flex-1">
          <Link href={`/overlay/editor/${overlay.id}`}>
            <Pencil className="mr-1.5 size-3.5" />
            Edit
          </Link>
        </Button>
        <Button size="sm" variant="outline" title="Copy OBS URL" onClick={copyUrl}>
          <Link2 className="size-3.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          title="Duplicate"
          disabled={atLimit || duplicate.isPending}
          onClick={() =>
            duplicate.mutate(overlay.id, {
              onError: error => toast.error(`Could not duplicate it: ${error.message}`),
            })
          }
        >
          <Copy className="size-3.5" />
        </Button>
        <Button
          size="sm"
          variant="destructive"
          title="Delete"
          disabled={remove.isPending}
          onClick={() => {
            if (window.confirm(`Delete "${overlay.name}"? Its OBS URL will stop working.`)) {
              remove.mutate(overlay.id, {
                onError: error => toast.error(`Could not delete it: ${error.message}`),
              });
            }
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Lists the user's overlays and creates new ones.
 */
export default function OverlayPicker() {
  const { data: overlays, isLoading, error } = useUserOverlays(true);
  const [creating, setCreating] = useState(false);
  const count = overlays?.length ?? 0;
  const atLimit = count >= MAX_USER_OVERLAYS;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Overlay editor</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Build stream overlays and add them to OBS as a browser source.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">
            {count} / {MAX_USER_OVERLAYS}
          </span>
          <Button variant="primary" disabled={atLimit} onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 size-4" />
            New overlay
          </Button>
        </div>
      </header>

      {error && <p className="text-destructive text-sm">Could not load your overlays: {error.message}</p>}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map(index => (
            <div key={index} className="bg-card ring-border h-32 animate-pulse rounded-xl ring-1" />
          ))}
        </div>
      )}

      {overlays && overlays.length === 0 && (
        <div className="ring-border bg-card flex flex-col items-center gap-3 rounded-xl p-12 text-center ring-1">
          <Monitor className="text-muted-foreground size-10" />
          <h2 className="text-lg font-semibold">You have no overlays yet</h2>
          <p className="text-muted-foreground max-w-md text-sm">
            Start from a preset and drag things around until it looks right.
          </p>
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 size-4" />
            Create your first overlay
          </Button>
        </div>
      )}

      {overlays && overlays.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {overlays.map(overlay => (
            <OverlayCard key={overlay.id} overlay={overlay} atLimit={atLimit} />
          ))}
        </div>
      )}

      <CreateOverlayDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
