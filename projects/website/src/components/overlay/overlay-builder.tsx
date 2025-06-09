"use client";

import { openInNewTab } from "@/common/browser-utils";
import { SettingIds } from "@/common/database/database";
import { OverlayDataClients } from "@/common/overlay/data-client";
import {
  defaultOverlaySettings,
  encodeOverlaySettings,
  OverlayViews,
} from "@/common/overlay/overlay-settings";
import Notice from "@/components/notice";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useDatabase from "@/hooks/use-database";
import { zodResolver } from "@hookform/resolvers/zod";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../ui/button";
import { Form, FormControl, FormDescription, FormItem, FormLabel } from "../ui/form";

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
  const database = useDatabase();
  const overlaySettings = useLiveQuery(async () => database.getOverlaySettings());

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultOverlaySettings,
  });

  useEffect(() => {
    if (!overlaySettings) {
      return;
    }

    form.setValue("playerId", overlaySettings.playerId || "");
    form.setValue("useRealTimeData", overlaySettings.useRealTimeData);
    form.setValue("dataClient", overlaySettings.dataClient || "");
    form.setValue("views", overlaySettings.views);
  }, [overlaySettings]);

  /**
   * Handles the form submission
   *
   * @param replayViewer the new replay viewer
   */
  async function onSubmit({
    playerId,
    useRealTimeData,
    dataClient,
    views,
  }: z.infer<typeof formSchema>) {
    const player = await ApiServiceRegistry.getInstance()
      .getScoreSaberService()
      .lookupPlayer(playerId);
    if (!player) {
      toast("The player id you entered could not be found.");
      return;
    }

    // Update the settings
    const overlaySettings = {
      playerId: playerId,
      useRealTimeData: useRealTimeData,
      dataClient: dataClient as OverlayDataClients,
      views: views as Record<OverlayViews, boolean>,
    };
    await database.setSetting(SettingIds.OverlaySettings, overlaySettings);
    openInNewTab(`/overlay?settings=${encodeOverlaySettings(overlaySettings)}`);
  }

  return (
    <div className="flex flex-col gap-3 text-sm w-full h-full p-2 items-center">
      {/* Title */}
      <p className="text-xl font-semibold">ScoreSaber Reloaded Overlay Builder</p>

      {/* Streamer Warning */}
      <Notice>
        You must use a resolution of 1920x1080 in OBS (or similar) to use this overlay.
      </Notice>

      {/* Unknown Account ID Notice */}
      <p className="text-sm text-muted-foreground text-center">
        If you don&#39;t know your player id, you can link your account and it will be automatically
        filled in.
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
                <FormDescription>
                  The id for the player you want to show in the overlay.
                </FormDescription>
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
                <FormDescription>
                  Whether to fetch real-time data from the data client.
                </FormDescription>
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={form.getValues().dataClient}
                    >
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
          <FormItem className="w-full">
            <FormLabel>Views</FormLabel>
            <FormDescription>Toggle which views to show in the overlay.</FormDescription>
            <div className="mt-4 space-y-2">
              {viewToggles.map(viewToggle => {
                return (
                  <FormField
                    key={viewToggle.value}
                    control={form.control}
                    name={`views.${viewToggle.value}`}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="font-normal">{viewToggle.name}</FormLabel>
                      </FormItem>
                    )}
                  />
                );
              })}
            </div>
          </FormItem>

          {/* Saving Settings */}
          <Button type="submit" className="w-fit">
            Open Overlay
          </Button>
        </form>
      </Form>
    </div>
  );
}
