"use client";

import { downloadFile } from "@/common/browser-utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { env } from "@ssr/common/env";
import {
  customRankedPlaylistSchema,
  encodeCustomRankedPlaylistSettings,
} from "@ssr/common/playlist/ranked/custom-ranked-playlist";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

export default function CustomPlaylistCreator() {
  const { control, handleSubmit, setValue, watch } = useForm<
    z.infer<typeof customRankedPlaylistSchema>
  >({
    resolver: zodResolver(customRankedPlaylistSchema),
    defaultValues: {
      stars: {
        min: 0,
        max: 20,
      },
      sort: "stars",
    },
  });

  async function onSubmit(data: z.infer<typeof customRankedPlaylistSchema>) {
    await downloadFile(
      `${env.NEXT_PUBLIC_API_URL}/playlist/scoresaber-custom-ranked-maps?config=${encodeCustomRankedPlaylistSettings(data)}`,
      `ssr-custom-ranked-${data.sort}-${data.stars.min}-${data.stars.max}-stars.bplist`
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Custom Playlist</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[650px]">
        <DialogTitle>Playlist Creator</DialogTitle>
        <DialogDescription>
          Create a custom playlist based on ScoreSaber Ranked Maps.
        </DialogDescription>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Stars */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-8">
              <div>
                <p>Stars</p>
                <p className="text-sm text-muted-foreground">
                  The star range of maps in the playlist.
                </p>
              </div>
              <Controller
                name="stars"
                control={control}
                render={({ field }) => (
                  <DualRangeSlider
                    min={0}
                    max={20}
                    value={[field.value.min, field.value.max]}
                    label={value => value}
                    onValueChange={value => {
                      field.onChange({ min: value[0], max: value[1] });
                    }}
                    step={1}
                  />
                )}
              />
            </div>
          </div>

          {/* Sort */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2">
              <div>
                <p>Sort</p>
                <p className="text-sm text-muted-foreground">
                  The sort order of the maps in the playlist.
                </p>
              </div>
              <Controller
                name="sort"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={value => field.onChange(value)} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stars">Stars</SelectItem>
                      <SelectItem value="dateRanked">Date Ranked</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Create Playlist Button */}
          <DialogFooter>
            <Link
              href={`${env.NEXT_PUBLIC_API_URL}/playlist/custom-ranked/preview?settings=${encodeCustomRankedPlaylistSettings(watch())}`}
            >
              <Button variant="outline" type="button">
                Preview Art
              </Button>
            </Link>
            <Button type="submit">Create Playlist</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
