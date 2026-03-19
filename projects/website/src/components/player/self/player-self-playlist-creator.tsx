"use client";

import { downloadFile } from "@/common/browser-utils";
import Card from "@/components/card";
import SimpleTooltip from "@/components/simple-tooltip";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ControlButton } from "@/components/ui/control-panel";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { Form, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { env } from "@ssr/common/env";
import {
  SelfPlaylistSettings,
  selfPlaylistSettingsSchema,
} from "@ssr/common/playlist/self/self-playlist-settings-schema";
import { encodeSelfPlaylistSettings } from "@ssr/common/playlist/self/self-playlist-utils";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { Download, Filter, MusicIcon, Trophy, User } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import PlayerActionButtonWrapper from "../buttons/player-action-button-wrapper";

const SORT_OPTIONS = {
  pp: { name: "PP", defaultOrder: "desc" as const },
  date: { name: "Date", defaultOrder: "desc" as const },
  acc: { name: "Accuracy", defaultOrder: "desc" as const },
  score: { name: "Score", defaultOrder: "desc" as const },
} as const;

const RANKED_OPTIONS = [
  { value: "all" as const, label: "All Scores", icon: Filter },
  { value: "ranked" as const, label: "Ranked Only", icon: Trophy },
  { value: "unranked" as const, label: "Unranked Only", icon: MusicIcon },
] as const;

type SortOption = keyof typeof SORT_OPTIONS;

function generateFilename(playerId: string, data: SelfPlaylistSettings): string {
  const scoreType =
    data.rankedStatus === "all" ? "all" : data.rankedStatus === "ranked" ? "ranked-only" : "unranked-only";
  const starRange =
    data.rankedStatus === "ranked" && data.starRange ? `-${data.starRange.min}-${data.starRange.max}⭐` : "";
  const accuracyRange = data.accuracyRange ? `-${data.accuracyRange.min}-${data.accuracyRange.max}%` : "";
  const sortInfo = `${data.sort}-${data.sortDirection ?? "desc"}`;
  return `ssr-self-${playerId}-${scoreType}${starRange}${accuracyRange}-${sortInfo}.bplist`;
}

export default function SelfPlaylistCreator() {
  const database = useDatabase();
  const playerId = useStableLiveQuery(() => database.getMainPlayerId());
  const [downloading, setDownloading] = useState(false);

  const form = useForm<SelfPlaylistSettings>({
    resolver: zodResolver(selfPlaylistSettingsSchema),
    defaultValues: {
      sort: "pp",
      sortDirection: "desc",
      rankedStatus: "ranked",
      starRange: { min: 0, max: SHARED_CONSTS.maxStars },
      accuracyRange: { min: 0, max: 100 },
    },
  });

  const rankedStatus = form.watch("rankedStatus");
  const sort = form.watch("sort");
  const sortDirection = form.watch("sortDirection");

  const availableSorts = useMemo(
    () => Object.entries(SORT_OPTIONS) as Array<[SortOption, (typeof SORT_OPTIONS)[SortOption]]>,
    []
  );

  const handleSort = useCallback(
    (newSort: SortOption) => {
      const opt = SORT_OPTIONS[newSort];
      form.setValue("sort", newSort);
      form.setValue("sortDirection", sort === newSort && sortDirection === "desc" ? "asc" : opt.defaultOrder);
    },
    [form, sort, sortDirection]
  );

  const handleSubmit = useCallback(
    async (data: SelfPlaylistSettings) => {
      if (!playerId) return;
      setDownloading(true);
      try {
        const encoded = encodeSelfPlaylistSettings(data);
        const filename = generateFilename(playerId, data);
        const url = `${env.NEXT_PUBLIC_API_URL}/playlist/self?user=${playerId}&settings=${encoded}`;
        await downloadFile(url, filename);
      } finally {
        setDownloading(false);
      }
    },
    [playerId]
  );

  if (!playerId) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger>
        <SimpleTooltip
          side="top"
          className="cursor-pointer"
          display={
            <p>
              Create a <b>self playlist</b> from your scores
            </p>
          }
        >
          <PlayerActionButtonWrapper>
            <User className="size-5" />
          </PlayerActionButtonWrapper>
        </SimpleTooltip>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-4xl">
        <DialogTitle className="sr-only">Create Self Playlist</DialogTitle>
        <DialogDescription className="sr-only">
          Generate a new playlist from your own scores.
        </DialogDescription>
        <Card className="relative m-0 flex h-full max-h-[85vh] flex-col rounded-lg">
          <div className="border-border border-b px-(--spacing-lg) py-(--spacing-lg) md:px-(--spacing-xl) md:py-(--spacing-xl)">
            <h1 className="text-xl font-semibold md:text-2xl">Create Self Playlist</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Generate a new playlist from your own scores.
            </p>
          </div>

          <div className="flex-1 overflow-x-hidden overflow-y-auto">
            <div className="p-(--spacing-lg) md:p-(--spacing-xl) lg:p-(--spacing-2xl)">
              <Form {...form}>
                <form id="self-playlist-form" onSubmit={form.handleSubmit(handleSubmit)}>
                  <ButtonGroup className="mb-(--spacing-xl)">
                    {availableSorts.map(([value, opt]) => {
                      const isActive = value === sort;
                      return (
                        <ControlButton
                          key={value}
                          isActive={isActive}
                          onClick={() => handleSort(value)}
                          type="button"
                        >
                          {opt.name}
                        </ControlButton>
                      );
                    })}
                  </ButtonGroup>

                  <div className="flex flex-col gap-6">
                    <Controller
                      name="rankedStatus"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem className="flex flex-col gap-2">
                          <FormLabel className="text-sm font-normal">Score Type</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select score type" />
                              </SelectTrigger>
                              <SelectContent>
                                {RANKED_OPTIONS.map(opt => {
                                  const Icon = opt.icon;
                                  return (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      <span className="flex items-center gap-2">
                                        <Icon className="size-3.5" />
                                        {opt.label}
                                      </span>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {rankedStatus === "ranked" && (
                      <Controller
                        name="starRange"
                        control={form.control}
                        render={({ field }) => {
                          const val = field.value ?? { min: 0, max: SHARED_CONSTS.maxStars };
                          return (
                            <FormItem className="flex flex-col gap-2">
                              <FormLabel className="text-sm font-normal">Star Range</FormLabel>
                              <FormControl>
                                <div className="w-full">
                                  <DualRangeSlider
                                    min={0}
                                    max={SHARED_CONSTS.maxStars}
                                    step={0.1}
                                    label={v => <span className="text-xs">{v}</span>}
                                    value={[val.min, val.max]}
                                    showLabelOnHover={false}
                                    onValueChange={vals => field.onChange({ min: vals[0], max: vals[1] })}
                                    className="w-full pt-10 pb-1"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    )}

                    <Controller
                      name="accuracyRange"
                      control={form.control}
                      render={({ field }) => {
                        const val = field.value ?? { min: 0, max: 100 };
                        return (
                          <FormItem className="flex flex-col gap-2">
                            <FormLabel className="text-sm font-normal">Accuracy Range</FormLabel>
                            <FormControl>
                              <div className="w-full">
                                <DualRangeSlider
                                  min={0}
                                  max={100}
                                  step={0.1}
                                  value={[val.min, val.max]}
                                  showLabelOnHover={false}
                                  onValueChange={vals => field.onChange({ min: vals[0], max: vals[1] })}
                                  className="w-full pt-10 pb-1"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                </form>
              </Form>
            </div>
          </div>

          <div className="border-border flex flex-wrap items-center justify-end gap-(--spacing-sm) border-t px-(--spacing-lg) py-(--spacing-lg) md:gap-(--spacing-lg) md:px-(--spacing-xl) md:py-(--spacing-xl)">
            <Button type="submit" form="self-playlist-form" className="gap-2" disabled={downloading}>
              {downloading ? <Spinner className="size-4" /> : <Download className="size-4" />}
              <span>Download Playlist</span>
            </Button>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
