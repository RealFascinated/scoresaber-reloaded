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
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import PlayerActionButtonWrapper from "../buttons/player-action-button-wrapper";

// Constants
const DEFAULT_EXPANDED_SECTIONS = new Set(["basic", "filters"]);
const SCORE_LIMIT_MIN = 25;
const SCORE_LIMIT_MAX = 250;
const SCORE_LIMIT_STEP = 25;
const ACCURACY_MIN = 70;
const ACCURACY_MAX = 100;
const ACCURACY_STEP = 0.1;
const STAR_STEP = 1;

const SORT_OPTIONS = {
  pp: {
    name: "PP",
    icon: <Trophy className="h-4 w-4" />,
    defaultOrder: "desc" as const,
  },
  date: {
    name: "Date",
    icon: <Clock className="h-4 w-4" />,
    defaultOrder: "desc" as const,
  },
  misses: {
    name: "Misses",
    icon: <XIcon className="h-4 w-4" />,
    defaultOrder: "desc" as const,
  },
  acc: {
    name: "Accuracy",
    icon: <Target className="h-4 w-4" />,
    defaultOrder: "desc" as const,
  },
  score: {
    name: "Score",
    icon: <BarChart3 className="h-4 w-4" />,
    defaultOrder: "desc" as const,
  },
  maxcombo: {
    name: "Max Combo",
    icon: <Hash className="h-4 w-4" />,
    defaultOrder: "desc" as const,
  },
} as const;

const RANKED_STATUS_OPTIONS = [
  {
    value: "all" as const,
    label: "All Scores",
    icon: <Filter className="h-3 w-3" />,
  },
  {
    value: "ranked" as const,
    label: "Ranked Only",
    icon: <Trophy className="h-3 w-3" />,
  },
  {
    value: "unranked" as const,
    label: "Unranked Only",
    icon: <MusicIcon className="h-3 w-3" />,
  },
] as const;

type SortOption = keyof typeof SORT_OPTIONS;

interface SnipePlaylistCreatorProps {
  toSnipe: ScoreSaberPlayer;
}

export default function SnipePlaylistCreator({ toSnipe }: SnipePlaylistCreatorProps) {
  const database = useDatabase();
  const playerId = useLiveQuery(() => database.getMainPlayerId());

  const [downloading, setDownloading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(DEFAULT_EXPANDED_SECTIONS);

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
        min: ACCURACY_MIN,
        max: ACCURACY_MAX,
      },
    },
  });

  const rankedStatus = useWatch({ control: form.control, name: "rankedStatus" });
  const currentSort = useWatch({ control: form.control, name: "sort" });
  const currentSortDirection = useWatch({ control: form.control, name: "sortDirection" });

  // Get available sort options based on ranked status
  const availableSortOptions = useMemo(() => {
    const baseOptions = Object.entries(SORT_OPTIONS).map(([value, option]) => ({
      value: value as SortOption,
      ...option,
    }));

    // Only show PP option for ranked or all scores
    if (rankedStatus === "unranked") {
      return baseOptions.filter(option => option.value !== "pp");
    }

    return baseOptions;
  }, [rankedStatus]);

  const handleSortChange = (sortValue: SortOption, direction?: "asc" | "desc") => {
    const sortOption = SORT_OPTIONS[sortValue];
    if (!sortOption) {
      return;
    }

    form.setValue("sort", sortValue);

    // Toggle direction if same sort option, otherwise use default or provided direction
    if (currentSort === sortValue) {
      const newDirection = currentSortDirection === "desc" ? "asc" : "desc";
      form.setValue("sortDirection", newDirection);
    } else {
      form.setValue("sortDirection", direction || sortOption.defaultOrder);
    }
  };

  const generateFilename = (data: z.infer<typeof snipeSettingsSchema>) => {
    const scoreType = data.rankedStatus === "all" ? "all" : data.rankedStatus === "ranked" ? "ranked-only" : "unranked-only";

    const starRange = data.rankedStatus === "ranked" && data.starRange
      ? `-${data.starRange.min}-${data.starRange.max}⭐` : "";

    const accRange = `-${data.accuracyRange.min}-${data.accuracyRange.max}%`;
    const sortInfo = `${data.sort}-${data.sortDirection}`;

    return `ssr-snipe-${toSnipe.id}-${scoreType}${starRange}${accRange}-${sortInfo}.bplist`;
  };

  const handleSubmit = async (data: z.infer<typeof snipeSettingsSchema>) => {
    setDownloading(true);
    try {
      const encodedData = encodeSnipePlaylistSettings(data);
      const filename = generateFilename(data);
      const downloadUrl = `${env.NEXT_PUBLIC_API_URL}/playlist/snipe?user=${playerId}&toSnipe=${toSnipe.id}&settings=${encodedData}`;

      await downloadFile(downloadUrl, filename);
    } finally {
      setDownloading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newExpanded = new Set(prev);
      newExpanded.has(section) ? newExpanded.delete(section) : newExpanded.add(section);
      return newExpanded;
    });
  };

  // Auto-switch to date sort for unranked scores
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

  const currentSortOption = SORT_OPTIONS[currentSort];
  const formValues = form.getValues();
  const previewUrl = `${env.NEXT_PUBLIC_API_URL}/playlist/snipe/preview?toSnipe=${toSnipe.id}&settings=${encodeSnipePlaylistSettings(formValues)}`;

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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Basic Settings Section */}
            <CollapsibleSection
              title="Basic Settings"
              icon={<Target className="h-4 w-4" />}
              isExpanded={expandedSections.has("basic")}
              onToggle={() => toggleSection("basic")}
            >
              <div className="space-y-4">
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
                          {availableSortOptions.map(option => {
                            const currentFormSort = form.getValues("sort");
                            const currentFormDirection = form.getValues("sortDirection");
                            return (
                              <ControlButton
                                key={option.value}
                                isActive={option.value === currentFormSort}
                                onClick={() => handleSortChange(option.value)}
                                type="button"
                              >
                                {option.value === currentFormSort ? (
                                  currentFormDirection === "desc" ? (
                                    <ArrowDown className="h-4 w-4" />
                                  ) : (
                                    <ArrowUp className="h-4 w-4" />
                                  )
                                ) : (
                                  option.icon
                                )}
                                {option.name}
                              </ControlButton>
                            );
                          })}
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
                          min={SCORE_LIMIT_MIN}
                          max={SCORE_LIMIT_MAX}
                          step={SCORE_LIMIT_STEP}
                          value={[field.value]}
                          onValueChange={value => field.onChange(value[0])}
                          className="mt-2"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CollapsibleSection>

            {/* Filters Section */}
            <CollapsibleSection
              title="Filters"
              icon={<Filter className="h-4 w-4" />}
              isExpanded={expandedSections.has("filters")}
              onToggle={() => toggleSection("filters")}
            >
              <div className="space-y-4">
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
                            {RANKED_STATUS_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                <span className="flex items-center gap-2">
                                  {option.icon}
                                  {option.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className={`grid gap-6 ${rankedStatus === "ranked" ? "grid-cols-2" : "grid-cols-1"}`}>
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
                              step={STAR_STEP}
                              label={value => <span className="text-xs">{value}</span>}
                              value={[field.value?.min ?? 0, field.value?.max ?? Consts.MAX_STARS]}
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
                            min={ACCURACY_MIN}
                            max={ACCURACY_MAX}
                            step={ACCURACY_STEP}
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
            </CollapsibleSection>

            {/* Preview Section */}
            <CollapsibleSection
              title="Preview & Settings"
              icon={<Eye className="h-4 w-4" />}
              isExpanded={expandedSections.has("preview")}
              onToggle={() => toggleSection("preview")}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h5 className="text-xs font-medium">Current Settings</h5>
                  <div className="text-muted-foreground space-y-1 text-xs">
                    <div>Name: {formValues.name}</div>
                    <div>
                      Sort: {currentSortOption?.name} (
                      {formValues.sortDirection === "desc" ? "Desc" : "Asc"})
                    </div>
                    <div>Limit: {formValues.limit} scores</div>
                    <div>
                      Score Type:{" "}
                      {
                        RANKED_STATUS_OPTIONS.find(opt => opt.value === formValues.rankedStatus)
                          ?.label
                      }
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
                      src={previewUrl}
                      alt="Playlist Preview"
                      className="h-auto max-w-full rounded-lg border"
                      style={{ maxHeight: "200px" }}
                    />
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Action Buttons */}
            <div className="border-muted/50 flex flex-row gap-2 border-t pt-4">
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

// Helper component for collapsible sections
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="border-muted/50 rounded-lg border">
      <button
        type="button"
        onClick={onToggle}
        className="hover:bg-muted/50 flex w-full items-center justify-between p-3 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {isExpanded && <div className="p-4 pt-0">{children}</div>}
    </div>
  );
}
