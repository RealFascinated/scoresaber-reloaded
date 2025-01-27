"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import useSettings from "@/hooks/use-settings";
import { Form, FormControl, FormDescription, FormItem, FormLabel } from "../ui/form";
import { FormField } from "@/components/ui/form";
import { Button } from "../ui/button";
import { Input } from "@/components/ui/input";
import { encodeOverlaySettings } from "@/common/overlay/overlay-settings";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import Notice from "@/components/notice";
import { openInNewTab } from "@/common/browser-utils";

const formSchema = z.object({
  playerId: z.string().min(1).max(32),
});

export default function OverlayBuilder() {
  const settings = useSettings();
  const { toast } = useToast();

  const overlaySettings = settings?.getOverlaySettings();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      playerId: overlaySettings?.playerId || "",
    },
  });

  if (!settings) {
    return;
  }

  /**
   * Handles the form submission
   *
   * @param replayViewer the new replay viewer
   */
  async function onSubmit({ playerId }: z.infer<typeof formSchema>) {
    const player = await scoresaberService.lookupPlayer(playerId);
    if (!player) {
      toast({
        title: "Player not found",
        description: "The player id you entered could not be found.",
        variant: "destructive",
      });
      return;
    }

    // Update the settings
    await settings.setOverlaySettings({
      playerId: playerId,
    });
    openInNewTab(`/overlay?settings=${encodeOverlaySettings(settings.getOverlaySettings())}`);
  }

  return (
    <div className="flex flex-col gap-3 text-sm w-full h-full p-2 items-center">
      {/* Title */}
      <p className="text-xl font-semibold">ScoreSaber Reloaded Overlay Builder</p>

      {/* Streamer Warning */}
      <Notice>You must use a resolution of 1920x1080 in OBS (or similar) to use this overlay.</Notice>

      {/* Unknown Account ID Notice */}
      <p className="text-sm text-muted-foreground">
        If you don&#39;t know your player id, you can link your account and it will be automatically filled in.
      </p>

      {/* Overlay Settings */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-2">
          {/* Player ID */}
          <FormField
            control={form.control}
            name="playerId"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Player ID</FormLabel>
                <FormDescription>The id for the player you want to show in the overlay.</FormDescription>
                <FormControl>
                  <Input placeholder="Player ID" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Saving Settings */}
          <Button type="submit" className="w-fit">
            Open Overlay
          </Button>
        </form>
      </Form>
    </div>
  );
}
