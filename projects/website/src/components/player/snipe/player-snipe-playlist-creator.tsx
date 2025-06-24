"use client";

import { downloadFile } from "@/common/browser-utils";
import SimpleTooltip from "@/components/simple-tooltip";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ControlButton } from "@/components/ui/control-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DualRangeSlider } from "@/components/ui/dual-range-slider";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import useDatabase from "@/hooks/use-database";
import { zodResolver } from "@hookform/resolvers/zod";
import { Consts } from "@ssr/common/consts";
import { env } from "@ssr/common/env";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { encodeSnipePlaylistSettings } from "@ssr/common/snipe/snipe-playlist-utils";
import { snipeSettingsSchema } from "@ssr/common/snipe/snipe-settings-schema";
import { truncateText } from "@ssr/common/string-utils";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Clock,
  Crosshair,
  Download,
  Eye,
  Filter,
  Hash,
  MusicIcon,
  Target,
  Trophy,
  XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import PlayerActionButtonWrapper from "../buttons/player-action-button-wrapper";

export default function SnipePlaylistCreator({
  toSnipe,
}: {
  /**
   * The user who is being sniped
   */
  toSnipe: ScoreSaberPlayer;
}) {
  const database = useDatabase();
  const playerId = useLiveQuery(() => database.getMainPlayerId());

  const [downloading, setDownloading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["basic", "filters"])
  );

  const form = useForm<z.infer<typeof snipeSettingsSchema>>({
    resolver: zodResolver(snipeSettingsSchema),
    defaultValues: {
      name: `Snipe ${toSnipe.name}`,
      sort: "pp",
      sortDirection: "desc",
      limit: 150,
      rankedStatus: "ranked",
      starRange: {
        min: 0,
        max: Consts.MAX_STARS,
      },
      accuracyRange: {
        min: 0,
        max: 100,
      },
    },
  });

  // Watch form values to update preview link
  const formValues = form.watch();
  const rankedStatus = form.watch("rankedStatus");
  const currentSort = form.watch("sort");
  const currentSortDirection = form.watch("sortDirection");

  const SORT_OPTIONS = [
    ...(rankedStatus === "ranked" || rankedStatus === "all"
      ? [
          {
            name: "PP",
            value: "pp" as const,
            icon: <Trophy className="h-4 w-4" />,
            defaultOrder: "desc" as const,
          },
        ]
      : []),
    {
      name: "Date",
      value: "date" as const,
      icon: <Clock className="h-4 w-4" />,
      defaultOrder: "desc" as const,
    },
    {
      name: "Misses",
      value: "misses" as const,
      icon: <XIcon className="h-4 w-4" />,
      defaultOrder: "desc" as const,
    },
    {
      name: "Accuracy",
      value: "acc" as const,
      icon: <Target className="h-4 w-4" />,
      defaultOrder: "desc" as const,
    },
    {
      name: "Score",
      value: "score" as const,
      icon: <BarChart3 className="h-4 w-4" />,
      defaultOrder: "desc" as const,
    },
    {
      name: "Max Combo",
      value: "maxcombo" as const,
      icon: <Hash className="h-4 w-4" />,
      defaultOrder: "desc" as const,
    },
  ];

  const handleSortChange = (
    sortValue: "pp" | "date" | "misses" | "acc" | "score" | "maxcombo",
    direction?: "asc" | "desc"
  ) => {
    const sortOption = SORT_OPTIONS.find(option => option.value === sortValue);
    if (sortOption) {
      form.setValue("sort", sortValue);
      // If clicking the same sort option, toggle direction; otherwise use default or provided direction
      if (currentSort === sortValue) {
        const newDirection = currentSortDirection === "desc" ? "asc" : "desc";
        form.setValue("sortDirection", newDirection);
      } else {
        form.setValue("sortDirection", direction || sortOption.defaultOrder);
      }
    }
  };

  const onSubmit = async (data: z.infer<typeof snipeSettingsSchema>) => {
    const encodedData = encodeSnipePlaylistSettings(data);
    setDownloading(true);

    // Create a more descriptive filename based on settings
    const scoreType =
      data.rankedStatus === "all"
        ? "all"
        : data.rankedStatus === "ranked"
          ? "ranked-only"
          : "unranked-only";
    const starRange =
      data.rankedStatus === "ranked" && data.starRange
        ? `-${data.starRange.min}-${data.starRange.max}⭐`
        : "";
    const accRange = `-${data.accuracyRange.min}-${data.accuracyRange.max}%`;
    const sortInfo = `${data.sort}-${data.sortDirection}`;

    const filename = `ssr-snipe-${toSnipe.id}-${scoreType}${starRange}${accRange}-${sortInfo}-${data.limit}scores.bplist`;

    await downloadFile(
      `${env.NEXT_PUBLIC_API_URL}/playlist/snipe?user=${playerId}&toSnipe=${toSnipe.id}&settings=${encodedData}`,
      filename
    );
    setDownloading(false);
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  useEffect(() => {
    if (rankedStatus === "unranked") {
      form.setValue("sort", "date");
      form.setValue("sortDirection", "desc");
      form.trigger();
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

      <DialogContent className="max-h-[85vh] max-w-[900px] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle>Create Snipe Playlist</DialogTitle>
          <DialogDescription>
            Generate a new snipe playlist for {truncateText(toSnipe.name, 16)}!
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Settings Section */}
            <div className="rounded-lg border">
              <button
                type="button"
                onClick={() => toggleSection("basic")}
                className="hover:bg-muted/50 flex w-full items-center justify-between p-3 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span className="font-medium">Basic Settings</span>
                </div>
                {expandedSections.has("basic") ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {expandedSections.has("basic") && (
                <div className="space-y-4 p-4 pt-0">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Playlist Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Snipe Playlist" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Sort By</FormLabel>
                        <FormControl>
                          <ButtonGroup>
                            {SORT_OPTIONS.map(option => (
                              <ControlButton
                                key={option.value}
                                isActive={option.value === currentSort}
                                onClick={() => handleSortChange(option.value)}
                              >
                                {option.value === currentSort ? (
                                  currentSortDirection === "desc" ? (
                                    <ArrowDown className="h-4 w-4" />
                                  ) : (
                                    <ArrowUp className="h-4 w-4" />
                                  )
                                ) : (
                                  option.icon
                                )}
                                {option.name}
                              </ControlButton>
                            ))}
                          </ButtonGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="limit"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-sm">Score Limit</FormLabel>
                          <span className="text-sm font-medium">{field.value} scores</span>
                        </div>
                        <FormControl>
                          <Slider
                            min={25}
                            max={250}
                            step={25}
                            value={[field.value]}
                            onValueChange={value => {
                              field.onChange(value[0]);
                            }}
                            className="mt-2"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Filters Section */}
            <div className="rounded-lg border">
              <button
                type="button"
                onClick={() => toggleSection("filters")}
                className="hover:bg-muted/50 flex w-full items-center justify-between p-3 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="font-medium">Filters</span>
                </div>
                {expandedSections.has("filters") ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {expandedSections.has("filters") && (
                <div className="space-y-4 p-4 pt-0">
                  <FormField
                    control={form.control}
                    name="rankedStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Score Type</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select score type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">
                                <span className="flex items-center gap-2">
                                  <Filter className="h-3 w-3" />
                                  All Scores
                                </span>
                              </SelectItem>
                              <SelectItem value="ranked">
                                <span className="flex items-center gap-2">
                                  <Trophy className="h-3 w-3" />
                                  Ranked Only
                                </span>
                              </SelectItem>
                              <SelectItem value="unranked">
                                <span className="flex items-center gap-2">
                                  <MusicIcon className="h-3 w-3" />
                                  Unranked Only
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-6">
                    {rankedStatus === "ranked" && (
                      <FormField
                        control={form.control}
                        name="starRange"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Star Range</FormLabel>
                            <FormControl>
                              <DualRangeSlider
                                min={0}
                                max={Consts.MAX_STARS}
                                step={1}
                                label={value => <span className="text-xs">{value}</span>}
                                value={[
                                  field.value?.min ?? 0,
                                  field.value?.max ?? Consts.MAX_STARS,
                                ]}
                                onValueChange={value => {
                                  field.onChange({ min: value[0], max: value[1] });
                                }}
                                className="pt-10 pb-1"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="accuracyRange"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Accuracy Range (%)</FormLabel>
                          <FormControl>
                            <DualRangeSlider
                              min={0}
                              max={100}
                              step={1}
                              label={value => <span className="text-xs">{value}%</span>}
                              value={[field.value.min, field.value.max]}
                              onValueChange={value => {
                                field.onChange({ min: value[0], max: value[1] });
                              }}
                              className="pt-10 pb-1"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Preview Section */}
            <div className="rounded-lg border">
              <button
                type="button"
                onClick={() => toggleSection("preview")}
                className="hover:bg-muted/50 flex w-full items-center justify-between p-3 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span className="font-medium">Preview & Settings</span>
                </div>
                {expandedSections.has("preview") ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {expandedSections.has("preview") && (
                <div className="p-4 pt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium">Current Settings</h5>
                      <div className="text-muted-foreground space-y-1 text-xs">
                        <div>Name: {formValues.name}</div>
                        <div>
                          Sort: {SORT_OPTIONS.find(opt => opt.value === formValues.sort)?.name} (
                          {formValues.sortDirection === "desc" ? "Desc" : "Asc"})
                        </div>
                        <div>Limit: {formValues.limit} scores</div>
                        <div>
                          Score Type:{" "}
                          {formValues.rankedStatus === "all"
                            ? "All Scores"
                            : formValues.rankedStatus === "ranked"
                              ? "Ranked Only"
                              : "Unranked Only"}
                        </div>
                        {rankedStatus === "ranked" && (
                          <div>
                            Stars: {formValues.starRange?.min}-{formValues.starRange?.max}
                          </div>
                        )}
                        <div>
                          Accuracy: {formValues.accuracyRange.min}%-{formValues.accuracyRange.max}%
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h5 className="text-xs font-medium">Preview</h5>
                      <div className="flex justify-center">
                        <img
                          src={`${env.NEXT_PUBLIC_API_URL}/playlist/snipe/preview?toSnipe=${toSnipe.id}&settings=${encodeSnipePlaylistSettings(formValues)}`}
                          alt="Playlist Preview"
                          className="h-auto max-w-full rounded-lg border"
                          style={{ maxHeight: "200px" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-row gap-2 border-t pt-4">
              <Button type="submit" className="flex-1 gap-2">
                {downloading ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                {downloading ? "Downloading..." : "Download Playlist"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
