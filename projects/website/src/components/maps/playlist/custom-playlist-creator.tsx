"use client";

import { downloadFile } from "@/common/browser-utils";
import Card from "@/components/card";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ControlButton } from "@/components/ui/control-panel";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { Form, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { env } from "@ssr/common/env";
import {
  customRankedPlaylistSchema,
  encodeCustomRankedPlaylistSettings,
} from "@ssr/common/playlist/ranked/custom-ranked-playlist";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { ArrowDown, Download } from "lucide-react";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

type CustomRankedPlaylist = z.infer<typeof customRankedPlaylistSchema>;

type CustomPlaylistCreatorProps = {
  trigger: React.ReactNode;
};

const sortOptions = [
  { value: "stars", label: "Stars" },
  { value: "dateRanked", label: "Date Ranked" },
  { value: "plays", label: "Plays" },
  { value: "dailyPlays", label: "Daily Plays" },
] as const;

export default function CustomPlaylistCreator({ trigger }: CustomPlaylistCreatorProps) {
  const [downloading, setDownloading] = useState(false);

  const form = useForm<CustomRankedPlaylist>({
    resolver: zodResolver(customRankedPlaylistSchema, { reportInput: true }),
    defaultValues: {
      stars: {
        min: 0,
        max: SHARED_CONSTS.maxStars,
      },
      sort: "stars",
    },
  });

  const sort = form.watch("sort");

  const onSubmit = useCallback(async (data: CustomRankedPlaylist) => {
    setDownloading(true);
    try {
      await downloadFile(
        `${env.NEXT_PUBLIC_API_URL}/playlist/scoresaber-custom-ranked-maps?config=${encodeCustomRankedPlaylistSettings(data)}`,
        `ssr-custom-ranked-${data.sort}-${data.stars.min}-${data.stars.max}-stars.bplist`
      );
    } finally {
      setDownloading(false);
    }
  }, []);

  const handleSort = useCallback(
    (newSort: CustomRankedPlaylist["sort"]) => {
      form.setValue("sort", newSort);
    },
    [form]
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-4xl">
        <DialogTitle className="sr-only">Create Custom Playlist</DialogTitle>
        <DialogDescription className="sr-only">
          Build a ranked maps playlist with your own star range and sort order.
        </DialogDescription>

        <Card className="relative m-0 flex h-full max-h-[85vh] flex-col rounded-lg">
          <div className="border-border border-b px-(--spacing-lg) py-(--spacing-lg) md:px-(--spacing-xl) md:py-(--spacing-xl)">
            <h1 className="text-xl font-semibold md:text-2xl">Create Custom Playlist</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Build a ranked maps playlist with your own star range and sort order.
            </p>
          </div>

          <div className="flex-1 overflow-x-hidden overflow-y-auto">
            <div className="p-(--spacing-lg) md:p-(--spacing-xl) lg:p-(--spacing-2xl)">
              <Form {...form}>
                <form id="custom-playlist-form" onSubmit={form.handleSubmit(onSubmit)}>
                  <ButtonGroup className="mb-(--spacing-xl)">
                    {sortOptions.map(opt => (
                      <ControlButton
                        key={opt.value}
                        isActive={opt.value === sort}
                        onClick={() => handleSort(opt.value)}
                        type="button"
                      >
                        <ArrowDown className="size-4" />
                        {opt.label}
                      </ControlButton>
                    ))}
                  </ButtonGroup>

                  <div className="flex flex-col gap-6">
                    <Controller
                      name="stars"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem className="flex flex-col gap-2">
                          <FormLabel className="text-sm font-normal">Star Range</FormLabel>
                          <FormControl>
                            <div className="w-full">
                              <DualRangeSlider
                                min={0}
                                max={SHARED_CONSTS.maxStars}
                                step={0.1}
                                label={v => <span className="text-xs">{v}</span>}
                                value={[field.value.min, field.value.max]}
                                showLabelOnHover={false}
                                onValueChange={vals => field.onChange({ min: vals[0], max: vals[1] })}
                                className="w-full pt-10 pb-1"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
            </div>
          </div>

          <div className="border-border flex flex-wrap items-center justify-end gap-(--spacing-sm) border-t px-(--spacing-lg) py-(--spacing-lg) md:gap-(--spacing-lg) md:px-(--spacing-xl) md:py-(--spacing-xl)">
            <Button type="submit" form="custom-playlist-form" className="gap-2" disabled={downloading}>
              {downloading ? <Spinner className="size-4" /> : <Download className="size-4" />}
              <span>Download Playlist</span>
            </Button>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
