"use client";

import { downloadFile } from "@/common/browser-utils";
import { LoadingIcon } from "@/components/loading-icon";
import SimpleTooltip from "@/components/simple-tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import useDatabase from "@/hooks/use-database";
import { RocketLaunchIcon } from "@heroicons/react/16/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { env } from "@ssr/common/env";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { encodeSnipePlaylistSettings } from "@ssr/common/snipe/snipe-playlist-utils";
import { snipeSettingsSchema } from "@ssr/common/snipe/snipe-settings-schema";
import { truncateText } from "@ssr/common/string-utils";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type SnipePlaylistDownloadButtonProps = {
  /**
   * The user who is being sniped
   */
  toSnipe: ScoreSaberPlayer;
};

export default function SnipePlaylistDownloadButton({ toSnipe }: SnipePlaylistDownloadButtonProps) {
  const database = useDatabase();
  const playerId = useLiveQuery(() => database.getMainPlayerId());

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
    const encodedData = encodeSnipePlaylistSettings(data);
    setDownloading(true);
    await downloadFile(
      `${env.NEXT_PUBLIC_API_URL}/playlist/snipe?user=${playerId}&toSnipe=${toSnipe.id}&settings=${encodedData}`,
      `ssr-snipe-${toSnipe.id}-${data.sort}.bplist`
    );
    setDownloading(false);
  };

  if (!playerId) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger>
        <SimpleTooltip
          side="bottom"
          className="cursor-pointer"
          display={
            <p>
              Snipe Playlists for <span className="font-semibold">{toSnipe.name}</span>
            </p>
          }
        >
          <RocketLaunchIcon className="h-5 w-5" />
        </SimpleTooltip>
      </DialogTrigger>

      <DialogContent className="bg-secondary">
        <DialogHeader>
          <DialogTitle>Create Snipe Playlist</DialogTitle>
          <DialogDescription>
            Generate a new snipe playlist for {truncateText(toSnipe.name, 16)}!
          </DialogDescription>
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
                  <FormDescription>
                    The amount of scores to include in the playlist.
                  </FormDescription>
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
                  <FormDescription>
                    The maps in this range will be included in the playlist.
                  </FormDescription>
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
                  <FormDescription>
                    The maps in this range will be included in the playlist.
                  </FormDescription>
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

            <div className="flex gap-2 justify-between">
              {/* Download Playlist */}
              <Button type="submit" className="w-fit">
                {downloading ? <LoadingIcon /> : "Download"}
              </Button>

              {/* Preview Playlist Art */}
              <Link
                href={`${env.NEXT_PUBLIC_API_URL}/playlist/snipe/preview?toSnipe=${toSnipe.id}&settings=${encodeSnipePlaylistSettings(form.getValues())}`}
                target="_blank"
                prefetch={false}
              >
                <Button type="button">Preview Playlist Art</Button>
              </Link>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
