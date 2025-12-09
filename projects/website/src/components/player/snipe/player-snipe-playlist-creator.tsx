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
import { SnipeSettings, snipeSettingsSchema } from "@ssr/common/snipe/snipe-settings-schema";
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
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import PlayerActionButtonWrapper from "../buttons/player-action-button-wrapper";

const DEFAULT_EXPANDED = new Set(["basic", "filters"]);
const SCORE_LIMIT_MIN = 25;
const SCORE_LIMIT_MAX = 250;
const SCORE_LIMIT_STEP = 25;
const ACCURACY_MIN = 70;
const ACCURACY_MAX = 100;
const ACCURACY_STEP = 0.1;
const STAR_STEP = 1;

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
  const sortInfo = `${data.sort}-${data.sortDirection ?? "desc"}`;
  return `ssr-snipe-${toSnipeId}-${scoreType}${starRange}${accRange}-${sortInfo}.bplist`;
}

export default function SnipePlaylistCreator({ toSnipe }: Props) {
  const database = useDatabase();
  const playerId = useLiveQuery(() => database.getMainPlayerId());
  const [downloading, setDownloading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(DEFAULT_EXPANDED);

  const form = useForm<SnipeSettings>({
    resolver: zodResolver(snipeSettingsSchema),
    defaultValues: {
      name: `Snipe ${toSnipe.name}`,
      sort: "pp",
      sortDirection: "desc",
      limit: 150,
      rankedStatus: "ranked",
      starRange: { min: 0, max: Consts.MAX_STARS },
      accuracyRange: { min: ACCURACY_MIN, max: ACCURACY_MAX },
    },
  });

  const rankedStatus = form.watch("rankedStatus");
  const sort = form.watch("sort");
  const sortDirection = form.watch("sortDirection");
  const formValues = form.watch();

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
      form.setValue(
        "sortDirection",
        sort === newSort && sortDirection === "desc" ? "asc" : opt.defaultOrder
      );
    },
    [form, sort, sortDirection]
  );

  const toggleExpanded = useCallback((section: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      return next;
    });
  }, []);

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

  if (!playerId) return null;

  const previewUrl = `${env.NEXT_PUBLIC_API_URL}/playlist/snipe/preview?toSnipe=${toSnipe.id}&settings=${encodeSnipePlaylistSettings(formValues)}`;
  const currentSortOpt = SORT_OPTIONS[sort];

  return (
    <Dialog>
      <DialogTrigger data-umami-event="player-snipe-creator-button">
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

        <form id="snipe-playlist-form" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-4">
            <CollapsibleSection
              title="Basic Settings"
              icon={<Target className="h-4 w-4" />}
              isExpanded={expanded.has("basic")}
              onToggle={() => toggleExpanded("basic")}
            >
              <div className="space-y-4">
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <label htmlFor="playlist-name" className="text-sm font-medium">
                        Playlist Name
                      </label>
                      <Input
                        {...field}
                        id="playlist-name"
                        placeholder="Snipe Playlist"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.error && (
                        <p className="text-destructive text-sm">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium">Sort By</label>
                  <ButtonGroup>
                    {availableSorts.map(opt => {
                      const isActive = opt.value === sort;
                      const Icon = opt.icon;
                      const DirectionIcon =
                        isActive && sortDirection === "desc" ? ArrowDown : ArrowUp;
                      return (
                        <ControlButton
                          key={opt.value}
                          isActive={isActive}
                          onClick={() => handleSort(opt.value)}
                          type="button"
                        >
                          {isActive ? (
                            <DirectionIcon className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                          {opt.name}
                        </ControlButton>
                      );
                    })}
                  </ButtonGroup>
                </div>

                <Controller
                  name="limit"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor="score-limit" className="text-sm font-medium">
                          Score Limit
                        </label>
                        <span className="text-sm font-medium">{field.value} scores</span>
                      </div>
                      <Slider
                        id="score-limit"
                        min={SCORE_LIMIT_MIN}
                        max={SCORE_LIMIT_MAX}
                        step={SCORE_LIMIT_STEP}
                        value={[field.value]}
                        onValueChange={vals => field.onChange(vals[0])}
                        className="mt-2"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.error && (
                        <p className="text-destructive text-sm">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Filters"
              icon={<Filter className="h-4 w-4" />}
              isExpanded={expanded.has("filters")}
              onToggle={() => toggleExpanded("filters")}
            >
              <div className="space-y-4">
                <Controller
                  name="rankedStatus"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div className="space-y-2">
                      <label htmlFor="ranked-status" className="text-sm font-medium">
                        Score Type
                      </label>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectTrigger id="ranked-status">
                          <SelectValue placeholder="Select score type" />
                        </SelectTrigger>
                        <SelectContent>
                          {RANKED_OPTIONS.map(opt => {
                            const Icon = opt.icon;
                            return (
                              <SelectItem key={opt.value} value={opt.value}>
                                <span className="flex items-center gap-2">
                                  <Icon className="h-3 w-3" />
                                  {opt.label}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {fieldState.error && (
                        <p className="text-destructive text-sm">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />

                <div
                  className={`grid gap-6 ${rankedStatus === "ranked" ? "grid-cols-2" : "grid-cols-1"}`}
                >
                  {rankedStatus === "ranked" && (
                    <Controller
                      name="starRange"
                      control={form.control}
                      render={({ field, fieldState }) => {
                        const val = field.value ?? { min: 0, max: Consts.MAX_STARS };
                        return (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Star Range</label>
                            <DualRangeSlider
                              min={0}
                              max={Consts.MAX_STARS}
                              step={STAR_STEP}
                              label={v => <span className="text-xs">{v}</span>}
                              value={[val.min, val.max]}
                              onValueChange={vals => field.onChange({ min: vals[0], max: vals[1] })}
                              className="pt-10 pb-1"
                            />
                            {fieldState.error && (
                              <p className="text-destructive text-sm">{fieldState.error.message}</p>
                            )}
                          </div>
                        );
                      }}
                    />
                  )}

                  <Controller
                    name="accuracyRange"
                    control={form.control}
                    render={({ field, fieldState }) => {
                      const val = field.value;
                      return (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Accuracy Range (%)</label>
                          <DualRangeSlider
                            min={ACCURACY_MIN}
                            max={ACCURACY_MAX}
                            step={ACCURACY_STEP}
                            label={v => <span className="text-xs">{v}%</span>}
                            value={[val.min, val.max]}
                            onValueChange={vals => field.onChange({ min: vals[0], max: vals[1] })}
                            className="pt-10 pb-1"
                          />
                          {fieldState.error && (
                            <p className="text-destructive text-sm">{fieldState.error.message}</p>
                          )}
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Preview & Settings"
              icon={<Eye className="h-4 w-4" />}
              isExpanded={expanded.has("preview")}
              onToggle={() => toggleExpanded("preview")}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h5 className="text-xs font-medium">Current Settings</h5>
                  <div className="text-muted-foreground space-y-1 text-xs">
                    <div>Name: {formValues.name}</div>
                    <div>
                      Sort: {currentSortOpt.name} (
                      {formValues.sortDirection === "desc" ? "Desc" : "Asc"})
                    </div>
                    <div>Limit: {formValues.limit} scores</div>
                    <div>
                      Score Type:{" "}
                      {RANKED_OPTIONS.find(o => o.value === formValues.rankedStatus)?.label}
                    </div>
                    {rankedStatus === "ranked" && formValues.starRange && (
                      <div>
                        Stars: {formValues.starRange.min}-{formValues.starRange.max}
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

            <div className="border-muted/50 flex flex-row gap-2 border-t pt-4">
              <Button
                type="submit"
                form="snipe-playlist-form"
                className="flex-1 gap-2"
                disabled={downloading}
              >
                {downloading ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                {downloading ? "Downloading..." : "Download Playlist"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
        className="hover:bg-muted/50 flex w-full items-center justify-between p-3 transition-colors duration-200"
        aria-expanded={isExpanded}
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
