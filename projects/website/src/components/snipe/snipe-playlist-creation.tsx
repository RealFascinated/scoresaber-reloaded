"use client";

import useSettings from "@/hooks/use-settings";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { truncateText } from "@ssr/common/string-utils";
import { RocketLaunchIcon } from "@heroicons/react/16/solid";
import Tooltip from "@/components/tooltip";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import React, { useState } from "react";
import { snipeSettingsSchema } from "@ssr/common/snipe/snipe-settings-schema";
import { Slider } from "@/components/ui/slider";
import { Config } from "@ssr/common/config";
import { downloadFile } from "@/common/browser-utils";
import { LoadingIcon } from "@/components/loading-icon";

type SnipePlaylistDownloadButtonProps = {
  /**
   * The user who is being sniped
   */
  toSnipe: ScoreSaberPlayer;
};

export default function SnipePlaylistDownloadButton({ toSnipe }: SnipePlaylistDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const form = useForm<z.infer<typeof snipeSettingsSchema>>({
    resolver: zodResolver(snipeSettingsSchema),
    defaultValues: {
      sort: "top",
      limit: 100,
      starRange: {
        min: 1,
        max: 20,
      },
      accuracyRange: {
        min: 0,
        max: 100,
      },
    },
  });

  const onSubmit = async (data: z.infer<typeof snipeSettingsSchema>) => {
    const encodedData = Buffer.from(JSON.stringify(data)).toString("base64");
    setDownloading(true);
    await downloadFile(
      `${Config.apiUrl}/playlist/snipe?user=${settings.playerId}&toSnipe=${toSnipe.id}&settings=${encodedData}`,
      `ssr-snipe-${toSnipe.id}-${data.sort}.json`
    );
    setDownloading(false);
  };

  const settings = useSettings();
  if (!settings?.playerId) {
    return undefined;
  }

  return (
    <Dialog>
      <DialogTrigger>
        <Tooltip
          side="bottom"
          className="cursor-pointer"
          display={
            <p>
              Snipe Playlists for <span className="font-semibold">{toSnipe.name}</span>
            </p>
          }
        >
          <RocketLaunchIcon className="h-5 w-5" />
        </Tooltip>
      </DialogTrigger>

      <DialogContent className="bg-secondary">
        <DialogHeader>
          <DialogTitle>Create Snipe Playlist</DialogTitle>
          <DialogDescription>Generate a new snipe playlist for {truncateText(toSnipe.name, 16)}!</DialogDescription>
        </DialogHeader>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-2">
            <FormField
              control={form.control}
              name="sort"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort</FormLabel>
                  <FormDescription>The scores to use in the playlist.</FormDescription>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a sort type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="top">Top Scores</SelectItem>
                        <SelectItem value="recent">Recent Scores</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limit</FormLabel>
                  <FormDescription>The amount of scores to include in the playlist.</FormDescription>
                  <div className="mb-2">{field.value}</div>
                  <FormControl>
                    <Slider
                      min={25}
                      max={250}
                      step={25}
                      value={[field.value]}
                      onValueChange={value => {
                        field.onChange(value[0]);
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="starRange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Star Range</FormLabel>
                  <FormDescription>The maps in this range will be included in the playlist.</FormDescription>
                  <FormControl>
                    <DualRangeSlider
                      min={1}
                      max={20}
                      step={1}
                      label={value => <span>{value}</span>}
                      value={[field.value.min, field.value.max]}
                      onValueChange={value => {
                        field.onChange({ min: value[0], max: value[1] });
                      }}
                      className="pt-7 pb-2"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accuracyRange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Accuracy Range</FormLabel>
                  <FormDescription>The maps in this range will be included in the playlist.</FormDescription>
                  <FormControl>
                    <DualRangeSlider
                      min={0}
                      max={100}
                      step={1}
                      label={value => <span>{value}</span>}
                      value={[field.value.min, field.value.max]}
                      onValueChange={value => {
                        field.onChange({ min: value[0], max: value[1] });
                      }}
                      className="pt-7 pb-2"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Download Playlist */}
            <Button type="submit" className="w-fit">
              {downloading ? <LoadingIcon /> : "Download"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
