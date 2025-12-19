"use client";

import { downloadFile } from "@/common/browser-utils";
import Card from "@/components/card";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ControlButton } from "@/components/ui/control-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { Form, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { env } from "@ssr/common/env";
import {
  customRankedPlaylistSchema,
  encodeCustomRankedPlaylistSettings,
} from "@ssr/common/playlist/ranked/custom-ranked-playlist";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { Download, Star, TrendingUp } from "lucide-react";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

type CustomRankedPlaylist = z.infer<typeof customRankedPlaylistSchema>;

const STAR_STEP = 1;

export default function CustomPlaylistCreator() {
  const [downloading, setDownloading] = useState(false);

  const form = useForm<CustomRankedPlaylist>({
    resolver: zodResolver(customRankedPlaylistSchema),
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
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Star className="hidden h-4 w-4 md:block" />
          Custom Playlist
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-0 sm:max-w-2xl">
        <DialogTitle className="sr-only">Custom Playlist</DialogTitle>
        <DialogDescription className="sr-only">
          Create a ranked maps playlist with your own settings.
        </DialogDescription>

        <Card className="relative m-0 flex flex-col rounded-lg">
          {/* Header */}
          <div className="border-border border-b px-(--spacing-lg) py-(--spacing-lg) md:px-(--spacing-xl) md:py-(--spacing-xl)">
            <h1 className="text-xl font-semibold md:text-2xl">Custom Playlist</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Create a ranked maps playlist with your own settings.
            </p>
          </div>

          {/* Content */}
          <div className="p-(--spacing-lg) md:p-(--spacing-xl)">
            <Form {...form}>
              <form id="custom-playlist-form" onSubmit={form.handleSubmit(onSubmit)}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                      <Star className="size-3.5" />
                      <span>Settings</span>
                    </div>

                    <div className="space-y-1">
                      <Controller
                        name="stars"
                        control={form.control}
                        render={({ field }) => (
                          <FormItem className="flex flex-col items-start space-y-2 py-1 md:flex-row md:items-center md:justify-between md:space-y-0">
                            <div className="flex-1 space-y-0 md:pr-4">
                              <FormLabel className="text-sm leading-tight font-normal">
                                Star Range
                              </FormLabel>
                            </div>
                            <FormControl>
                              <div className="flex w-full items-center gap-3 md:w-52">
                                <DualRangeSlider
                                  min={0}
                                  max={SHARED_CONSTS.maxStars}
                                  step={STAR_STEP}
                                  label={v => <span className="text-xs">{v}</span>}
                                  value={[field.value.min, field.value.max]}
                                  showLabelOnHover={false}
                                  onValueChange={vals =>
                                    field.onChange({ min: vals[0], max: vals[1] })
                                  }
                                  className="pt-10 pb-1 md:w-52"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-muted-foreground flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                      <TrendingUp className="size-3.5" />
                      <span>Sort</span>
                    </div>
                    <ButtonGroup className="justify-start">
                      <ControlButton
                        isActive={sort === "stars"}
                        onClick={() => handleSort("stars")}
                      >
                        <Star className="h-4 w-4" />
                        Stars
                      </ControlButton>
                      <ControlButton
                        isActive={sort === "dateRanked"}
                        onClick={() => handleSort("dateRanked")}
                      >
                        <TrendingUp className="h-4 w-4" />
                        Date Ranked
                      </ControlButton>
                    </ButtonGroup>
                  </div>
                </div>
              </form>
            </Form>
          </div>

          {/* Footer */}
          <div className="border-border flex flex-wrap items-center justify-end gap-(--spacing-sm) border-t px-(--spacing-lg) py-(--spacing-lg) md:gap-(--spacing-lg) md:px-(--spacing-xl) md:py-(--spacing-xl)">
            <Button
              type="submit"
              form="custom-playlist-form"
              className="gap-2"
              disabled={downloading}
            >
              {downloading ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              <span>Download Playlist</span>
            </Button>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
