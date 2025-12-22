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
import { Switch } from "@/components/ui/switch";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { env } from "@ssr/common/env";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { encodeSnipePlaylistSettings } from "@ssr/common/snipe/snipe-playlist-utils";
import { SnipeSettings, snipeSettingsSchema } from "@ssr/common/snipe/snipe-settings-schema";
import { truncateText } from "@ssr/common/string-utils";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Clock,
  Crosshair,
  Download,
  Filter,
  Hash,
  MusicIcon,
  Target,
  Trophy,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import PlayerActionButtonWrapper from "../buttons/player-action-button-wrapper";

const SORT_OPTIONS = {
  pp: { name: "PP", icon: Trophy, defaultOrder: "desc" as const },
  date: { name: "Date", icon: Clock, defaultOrder: "desc" as const },
  misses: { name: "Misses", icon: XIcon, defaultOrder: "desc" as const },
  acc: { name: "Accuracy", icon: Target, defaultOrder: "desc" as const },
  score: { name: "Score", icon: BarChart3, defaultOrder: "desc" as const },
  maxcombo: { name: "Max Combo", icon: Hash, defaultOrder: "desc" as const },
} as const;

const RANKED_OPTIONS = [
  { value: "all" as const, label: "All Scores", icon: Filter },
  { value: "ranked" as const, label: "Ranked Only", icon: Trophy },
  { value: "unranked" as const, label: "Unranked Only", icon: MusicIcon },
] as const;

type SortOption = keyof typeof SORT_OPTIONS;

interface Props {
  toSnipe: ScoreSaberPlayer;
}

function generateFilename(toSnipeId: string, data: SnipeSettings): string {
  const scoreType =
    data.rankedStatus === "all" ? "all" : data.rankedStatus === "ranked" ? "ranked-only" : "unranked-only";
  const starRange =
    data.rankedStatus === "ranked" && data.starRange ? `-${data.starRange.min}-${data.starRange.max}⭐` : "";
  const sortInfo = `${data.sort}-${data.sortDirection ?? "desc"}`;
  const accuracyRange = data.accuracyRange ? `-${data.accuracyRange.min}-${data.accuracyRange.max}%` : "";
  return `ssr-snipe-${toSnipeId}-${scoreType}${starRange}${accuracyRange}-${sortInfo}.bplist`;
}

export default function SnipePlaylistCreator({ toSnipe }: Props) {
  const database = useDatabase();
  const playerId = useStableLiveQuery(() => database.getMainPlayerId());
  const [downloading, setDownloading] = useState(false);

  const form = useForm<SnipeSettings>({
    resolver: zodResolver(snipeSettingsSchema),
    defaultValues: {
      sort: "pp",
      sortDirection: "desc",
      accuracyRange: { min: 0, max: 100 },
      rankedStatus: "ranked",
      starRange: { min: 0, max: SHARED_CONSTS.maxStars },
      requireBothScores: false,
    },
  });

  const rankedStatus = form.watch("rankedStatus");
  const sort = form.watch("sort");
  const sortDirection = form.watch("sortDirection");

  const availableSorts = useMemo(() => {
    const all = Object.entries(SORT_OPTIONS).map(([value, opt]) => ({
      value: value as SortOption,
      ...opt,
    }));
    return rankedStatus === "unranked" ? all.filter(s => s.value !== "pp") : all;
  }, [rankedStatus]);

  const handleSort = useCallback(
    (newSort: SortOption) => {
      const opt = SORT_OPTIONS[newSort];
      form.setValue("sort", newSort);
      form.setValue("sortDirection", sort === newSort && sortDirection === "desc" ? "asc" : opt.defaultOrder);
    },
    [form, sort, sortDirection]
  );

  const handleSubmit = useCallback(
    async (data: SnipeSettings) => {
      if (!playerId) return;
      setDownloading(true);
      try {
        const encoded = encodeSnipePlaylistSettings(data);
        const filename = generateFilename(toSnipe.id, data);
        const url = `${env.NEXT_PUBLIC_API_URL}/playlist/snipe?user=${playerId}&toSnipe=${toSnipe.id}&settings=${encoded}`;
        await downloadFile(url, filename);
      } finally {
        setDownloading(false);
      }
    },
    [playerId, toSnipe.id]
  );

  useEffect(() => {
    if (rankedStatus === "unranked") {
      form.setValue("sort", "date");
      form.setValue("sortDirection", "desc");
    }
  }, [rankedStatus, form]);

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
              Create a snipe playlist for <b>{toSnipe.name}</b>
            </p>
          }
        >
          <PlayerActionButtonWrapper>
            <Crosshair className="h-5 w-5" />
          </PlayerActionButtonWrapper>
        </SimpleTooltip>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-4xl">
        <DialogTitle className="sr-only">Create Snipe Playlist</DialogTitle>
        <DialogDescription className="sr-only">
          Generate a new snipe playlist for {truncateText(toSnipe.name, 16)}!
        </DialogDescription>
        <Card className="relative m-0 flex h-full max-h-[85vh] flex-col rounded-lg">
          {/* Header */}
          <div className="border-border border-b px-(--spacing-lg) py-(--spacing-lg) md:px-(--spacing-xl) md:py-(--spacing-xl)">
            <h1 className="text-xl font-semibold md:text-2xl">Create Snipe Playlist</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Generate a new snipe playlist for {truncateText(toSnipe.name, 16)}!
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-x-hidden overflow-y-auto">
            <div className="p-(--spacing-lg) md:p-(--spacing-xl) lg:p-(--spacing-2xl)">
              <Form {...form}>
                <form id="snipe-playlist-form" onSubmit={form.handleSubmit(handleSubmit)}>
                  <ButtonGroup className="mb-(--spacing-xl)">
                    {availableSorts.map(opt => {
                      const isActive = opt.value === sort;
                      const Icon = opt.icon;
                      const DirectionIcon = isActive && sortDirection === "desc" ? ArrowDown : ArrowUp;
                      return (
                        <ControlButton
                          key={opt.value}
                          isActive={isActive}
                          onClick={() => handleSort(opt.value)}
                          type="button"
                        >
                          {isActive ? <DirectionIcon className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                          {opt.name}
                        </ControlButton>
                      );
                    })}
                  </ButtonGroup>

                  {/* Filters */}
                  <div className="space-y-6">
                    <Controller
                      name="rankedStatus"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <FormItem className="space-y-2">
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
                                        <Icon className="h-3.5 w-3.5" />
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
                        render={({ field, fieldState }) => {
                          const val = field.value ?? { min: 0, max: SHARED_CONSTS.maxStars };
                          return (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-normal">Star Range</FormLabel>
                              <FormControl>
                                <div className="w-full">
                                  <DualRangeSlider
                                    min={0}
                                    max={SHARED_CONSTS.maxStars}
                                    step={1}
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
                      render={({ field, fieldState }) => {
                        const val = field.value ?? { min: 0, max: 100 };
                        return (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-sm font-normal">Accuracy Range</FormLabel>
                            <FormControl>
                              <div className="w-full">
                                <DualRangeSlider
                                  min={0}
                                  max={100}
                                  step={0.1}
                                  label={v => (
                                    <span className="text-xs">{v !== undefined ? v.toFixed(0) : "0.0"}%</span>
                                  )}
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

                  <Controller
                    name="requireBothScores"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="mt-(--spacing-xl) flex flex-row items-center justify-between">
                        <FormLabel className="text-sm font-normal">
                          Require Both Players Have Scores on a Leaderboard
                        </FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>
          </div>

          {/* Footer */}
          <div className="border-border flex flex-wrap items-center justify-end gap-(--spacing-sm) border-t px-(--spacing-lg) py-(--spacing-lg) md:gap-(--spacing-lg) md:px-(--spacing-xl) md:py-(--spacing-xl)">
            <Button type="submit" form="snipe-playlist-form" className="gap-2" disabled={downloading}>
              {downloading ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              <span>Download Playlist</span>
            </Button>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
