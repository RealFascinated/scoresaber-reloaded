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
import { encodeOverlaySettings, OverlayViews } from "@/common/overlay/overlay-settings";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import Notice from "@/components/notice";
import { openInNewTab } from "@/common/browser-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OverlayDataClients } from "@/common/overlay/data-client";
import { Checkbox } from "@/components/ui/checkbox";

const viewToggles = [
  {
    name: "Player Info",
    value: OverlayViews.PlayerInfo,
  },
  {
    name: "Score Info",
    value: OverlayViews.ScoreInfo,
  },
  {
    name: "Song Info",
    value: OverlayViews.SongInfo,
  },
];

const formSchema = z.object({
  playerId: z.string().min(1).max(32),
  useRealTimeData: z.boolean(),
  dataClient: z.string().min(1).max(32),
  views: z.record(z.boolean()),
});

export default function OverlayBuilder() {
  const settings = useSettings();
  const { toast } = useToast();

  const overlaySettings = settings?.getOverlaySettings();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      playerId: overlaySettings!.playerId,
      useRealTimeData: overlaySettings!.useRealTimeData,
      dataClient: overlaySettings!.dataClient,
      views: overlaySettings!.views,
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
  async function onSubmit({ playerId, useRealTimeData, dataClient, views }: z.infer<typeof formSchema>) {
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
      useRealTimeData: useRealTimeData,
      dataClient: dataClient as OverlayDataClients,
      views: views as Record<OverlayViews, boolean>,
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

          {/* Use Real-Time Data */}
          <FormField
            control={form.control}
            name="useRealTimeData"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Use Real-Time Data</FormLabel>
                <FormDescription>Whether to fetch real-time data from the data client.</FormDescription>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Data Clients */}
          {form.getValues().useRealTimeData && (
            <FormField
              control={form.control}
              name="dataClient"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Data Client</FormLabel>
                  <FormDescription>The data client to use for the overlay.</FormDescription>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={form.getValues().dataClient}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a data client to use" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(OverlayDataClients).map(([id, clientName]) => {
                          return (
                            <SelectItem key={id} value={id}>
                              {clientName}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          {/* View Toggles */}
          <FormField
            control={form.control}
            name="views"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel className="text-base">Views</FormLabel>
                  <FormDescription>Toggle which views to show in the overlay.</FormDescription>
                </div>
                {viewToggles.map(item => (
                  <FormField
                    key={item.name}
                    control={form.control}
                    name={`views.${item.value}`}
                    render={({ field }) => {
                      return (
                        <FormItem key={item.name} className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">{item.name}</FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
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
