"use client";

import { openInNewTab } from "@/common/browser-utils";
import { SettingIds } from "@/common/database/database";
import { OverlayDataClients } from "@/common/overlay/data-client";
import {
  defaultOverlaySettings,
  encodeOverlaySettings,
  OverlayViews,
} from "@/common/overlay/overlay-settings";
import Notice from "@/components/notice";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useDatabase from "@/hooks/use-database";
import { zodResolver } from "@hookform/resolvers/zod";
import { DetailType } from "@ssr/common/detail-type";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronDown, ChevronRight, Eye, Monitor, Settings, User, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../ui/button";
import { Form, FormControl, FormDescription, FormItem, FormLabel } from "../ui/form";

// Constants
const DEFAULT_EXPANDED_SECTIONS = new Set(["basic", "views"]);

const viewToggles = [
  {
    name: "Player Info",
    value: OverlayViews.PlayerInfo,
    requiresRealTimeData: false,
    icon: <User className="h-4 w-4" />,
  },
  {
    name: "Score Info",
    value: OverlayViews.ScoreInfo,
    requiresRealTimeData: true,
    icon: <Eye className="h-4 w-4" />,
  },
  {
    name: "Song Info",
    value: OverlayViews.SongInfo,
    requiresRealTimeData: true,
    icon: <Monitor className="h-4 w-4" />,
  },
];

const formSchema = z.object({
  playerId: z.string().min(1).max(32),
  useRealTimeData: z.boolean(),
  dataClient: z.string().min(1).max(32),
  views: z.record(z.boolean()),
});

export default function OverlayBuilder() {
  const database = useDatabase();
  const overlaySettings = useLiveQuery(async () => database.getOverlaySettings());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(DEFAULT_EXPANDED_SECTIONS);
  const [isRealTimeDataEnabled, setIsRealTimeDataEnabled] = useState(true);
  const hasInitialized = useRef(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultOverlaySettings,
  });

  // Watch form values
  const formValues = form.watch();
  const useRealTimeData = form.watch("useRealTimeData");
  const views = form.watch("views");

  useEffect(() => {
    if (!overlaySettings) {
      return;
    }

    form.setValue("playerId", overlaySettings.playerId || "");
    form.setValue("useRealTimeData", overlaySettings.useRealTimeData);
    form.setValue("dataClient", overlaySettings.dataClient || "");

    // Ensure views object has the correct structure
    const normalizedViews = {
      [OverlayViews.PlayerInfo]: overlaySettings.views?.[OverlayViews.PlayerInfo] ?? true,
      [OverlayViews.ScoreInfo]: overlaySettings.views?.[OverlayViews.ScoreInfo] ?? true,
      [OverlayViews.SongInfo]: overlaySettings.views?.[OverlayViews.SongInfo] ?? true,
    };

    form.setValue("views", normalizedViews);
    setIsRealTimeDataEnabled(overlaySettings.useRealTimeData);
    hasInitialized.current = true;
  }, [overlaySettings]);

  // Auto-save settings to database when form values change
  useEffect(() => {
    // Don't save on initial load
    if (!overlaySettings || !hasInitialized.current) {
      return;
    }

    const currentValues = form.getValues();
    const settingsToSave = {
      playerId: currentValues.playerId,
      useRealTimeData: currentValues.useRealTimeData,
      dataClient: currentValues.dataClient as OverlayDataClients,
      views: currentValues.views as Record<OverlayViews, boolean>,
    };

    // Only save if values have actually changed
    const hasChanged =
      settingsToSave.playerId !== overlaySettings.playerId ||
      settingsToSave.useRealTimeData !== overlaySettings.useRealTimeData ||
      settingsToSave.dataClient !== overlaySettings.dataClient ||
      JSON.stringify(settingsToSave.views) !== JSON.stringify(overlaySettings.views);

    if (hasChanged) {
      database.setSetting(SettingIds.OverlaySettings, settingsToSave);
    }
  }, [formValues, overlaySettings, database]);

  const handleRealTimeDataChange = (value: boolean) => {
    // Don't run during initial load
    if (!hasInitialized.current) {
      return;
    }

    setIsRealTimeDataEnabled(value);
    form.setValue("useRealTimeData", value);

    // If turning off real-time data, disable views that require it
    if (!value) {
      const currentViews = form.getValues("views");
      const updatedViews = { ...currentViews };

      viewToggles.forEach(viewToggle => {
        if (viewToggle.requiresRealTimeData) {
          updatedViews[viewToggle.value] = false;
        }
      });

      form.setValue("views", updatedViews);
    }
  };

  /**
   * Handles the form submission
   *
   * @param replayViewer the new replay viewer
   */
  async function onSubmit({
    playerId,
    useRealTimeData,
    dataClient,
    views,
  }: z.infer<typeof formSchema>) {
    const player = await ssrApi.getScoreSaberPlayer(playerId, {
      type: DetailType.BASIC,
    });
    if (!player) {
      toast.error("The player id you entered could not be found.");
      return;
    }

    // Update the settings
    const overlaySettings = {
      playerId: playerId,
      useRealTimeData: useRealTimeData,
      dataClient: dataClient as OverlayDataClients,
      views: views as Record<OverlayViews, boolean>,
    };
    await database.setSetting(SettingIds.OverlaySettings, overlaySettings);
    openInNewTab(`/overlay?settings=${encodeOverlaySettings(overlaySettings)}`);
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(section)) {
        newExpanded.delete(section);
      } else {
        newExpanded.add(section);
      }
      return newExpanded;
    });
  };

  return (
    <div className="flex h-full w-full flex-col items-center gap-4 p-4 text-sm">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold">Overlay Builder</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure your streaming overlay settings
        </p>
      </div>

      {/* Streamer Warning */}
      <Notice>
        You must use a resolution of 1920x1080 in OBS (or similar) to use this overlay.
      </Notice>

      {/* Unknown Account ID Notice */}
      <p className="text-muted-foreground text-center text-sm">
        If you don&#39;t know your player id, you can link your account and it will be automatically
        filled in.
      </p>

      {/* Overlay Settings */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-2xl space-y-4">
          {/* Basic Settings Section */}
          <CollapsibleSection
            title="Basic Settings"
            icon={<Settings className="h-4 w-4" />}
            isExpanded={expandedSections.has("basic")}
            onToggle={() => toggleSection("basic")}
          >
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="playerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Player ID</FormLabel>
                    <FormDescription>
                      The id for the player you want to show in the overlay.
                    </FormDescription>
                    <FormControl>
                      <Input placeholder="Enter your ScoreSaber player ID" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="useRealTimeData"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-y-0 space-x-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={checked => {
                          field.onChange(checked);
                          handleRealTimeDataChange(checked as boolean);
                        }}
                      />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel className="text-sm">Use Real-Time Data</FormLabel>
                      <FormDescription>
                        Whether to fetch real-time data from the data client.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Data Clients */}
              {isRealTimeDataEnabled && (
                <FormField
                  control={form.control}
                  name="dataClient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Data Client</FormLabel>
                      <FormDescription>The data client to use for the overlay.</FormDescription>
                      <FormControl>
                        <Select
                          onValueChange={value => {
                            field.onChange(value);
                          }}
                          defaultValue={form.getValues().dataClient}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a data client to use" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(OverlayDataClients).map(([id, clientName]) => {
                              return (
                                <SelectItem key={id} value={id}>
                                  {clientName}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
            </div>
          </CollapsibleSection>

          {/* Views Section */}
          <CollapsibleSection
            title="Overlay Views"
            icon={<Users className="h-4 w-4" />}
            isExpanded={expandedSections.has("views")}
            onToggle={() => toggleSection("views")}
          >
            <div className="space-y-4">
              <div>
                <FormLabel className="text-sm">Enabled Views</FormLabel>
                <FormDescription>Toggle which views to show in the overlay.</FormDescription>
              </div>

              <div className="space-y-3">
                {viewToggles.map(viewToggle => {
                  const isDisabled = viewToggle.requiresRealTimeData && !isRealTimeDataEnabled;

                  return (
                    <FormField
                      key={viewToggle.value}
                      control={form.control}
                      name={`views.${viewToggle.value}`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-y-0 space-x-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isDisabled}
                            />
                          </FormControl>
                          <div
                            className={`flex items-center space-x-2 ${isDisabled ? "opacity-50" : ""}`}
                          >
                            {viewToggle.icon}
                            <FormLabel className="font-normal">
                              {viewToggle.name}
                              {viewToggle.requiresRealTimeData && (
                                <span className="text-muted-foreground ml-1 text-xs">
                                  (requires real-time data)
                                </span>
                              )}
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  );
                })}
              </div>
            </div>
          </CollapsibleSection>

          {/* Action Buttons */}
          <div className="border-muted/50 flex flex-row gap-2 border-t pt-4">
            <Button type="submit" className="flex-1">
              Open Overlay
            </Button>
          </div>
        </form>
      </Form>
    </div>
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
