"use client";

import {
  BACKGROUND_COVER_CUSTOM,
  BACKGROUND_COVER_NONE,
  BACKGROUND_COVER_PRESETS,
  parseCustomBackground,
} from "@/common/background-covers";
import { DEBOUNCE_MS_FORM } from "@/common/debounce";
import { cn } from "@/common/utils";
import { FormDescription, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { useDebounce } from "@uidotdev/usehooks";
import { ReactNode, useEffect, useState } from "react";
import { getMonotonicTimeMs, showSettingsSavedToast } from "./settings-feedback";

type BackgroundCoverControlProps = {
  field: {
    // Shared settings form value union; this field only ever holds a cover id
    value: string | number | boolean;
    onChange: (value: string | number | boolean) => void;
  };
};

function CoverOption({
  label,
  selected,
  onSelect,
  children,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "group flex cursor-pointer flex-col gap-1.5 rounded-lg p-1 text-left transition-colors",
        selected ? "bg-primary/10" : "hover:bg-hover"
      )}
    >
      <div
        className={cn(
          "bg-muted relative aspect-video w-full overflow-hidden rounded-md ring-2 transition-colors",
          selected ? "ring-primary" : "ring-border group-hover:ring-primary/50"
        )}
      >
        {children}
      </div>
      <span
        className={cn(
          "truncate px-0.5 text-xs",
          selected ? "text-primary font-medium" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
    </button>
  );
}

function CustomPreview({ value }: { value: string }) {
  const background = parseCustomBackground(value);
  if (!background) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-xs">Custom</div>
    );
  }
  if (background.type === "color") {
    return <div className="h-full w-full" style={{ backgroundColor: background.value }} />;
  }
  return <img src={background.value} alt="" className="h-full w-full object-cover" loading="lazy" />;
}

export function BackgroundCoverControl({ field }: BackgroundCoverControlProps) {
  const database = useDatabase();
  const storedCustom = useStableLiveQuery(async () => database.getCustomBackground());

  const [customValue, setCustomValue] = useState<string | undefined>(undefined);
  const debouncedCustomValue = useDebounce(customValue, DEBOUNCE_MS_FORM);

  // Seed the input from the database once it has loaded
  useEffect(() => {
    if (customValue === undefined && storedCustom !== undefined) {
      queueMicrotask(() => setCustomValue(storedCustom));
    }
  }, [customValue, storedCustom]);

  // Persist the custom value once the user stops typing
  useEffect(() => {
    if (debouncedCustomValue === undefined || debouncedCustomValue === storedCustom) {
      return;
    }
    const before = getMonotonicTimeMs();
    database.setCustomBackground(debouncedCustomValue).then(() => showSettingsSavedToast(before));
  }, [database, debouncedCustomValue, storedCustom]);

  const selected = String(field.value);
  const isCustom = selected === BACKGROUND_COVER_CUSTOM;
  const isCustomInvalid = isCustom && !!customValue && !parseCustomBackground(customValue);

  return (
    <div className="flex flex-col gap-3">
      <div className="w-full min-w-0">
        <FormLabel className="text-foreground text-[15px] leading-snug font-medium">Background</FormLabel>
        <FormDescription className="text-muted-foreground mt-1 text-[13px] leading-snug">
          Pick a preset image, or use your own hex color or image URL
        </FormDescription>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <CoverOption
          label="None"
          selected={selected === BACKGROUND_COVER_NONE}
          onSelect={() => field.onChange(BACKGROUND_COVER_NONE)}
        >
          <div className="bg-background h-full w-full" />
        </CoverOption>
        {BACKGROUND_COVER_PRESETS.map(preset => (
          <CoverOption
            key={preset.id}
            label={preset.name}
            selected={selected === preset.id}
            onSelect={() => field.onChange(preset.id)}
          >
            <img src={preset.image} alt="" className="h-full w-full object-cover" loading="lazy" />
          </CoverOption>
        ))}
        <CoverOption
          label="Custom"
          selected={isCustom}
          onSelect={() => field.onChange(BACKGROUND_COVER_CUSTOM)}
        >
          <CustomPreview value={customValue ?? ""} />
        </CoverOption>
      </div>

      {isCustom && (
        <div className="flex flex-col gap-1.5">
          <Input
            placeholder="#1a1a2e or https://example.com/image.jpg"
            value={customValue ?? ""}
            onChange={e => setCustomValue(e.target.value)}
            aria-invalid={isCustomInvalid}
            className={cn("w-full max-w-xl", isCustomInvalid && "border-destructive")}
          />
          {isCustomInvalid && (
            <p className="text-destructive text-[13px]">
              Enter a hex color (e.g. #1a1a2e) or an http(s) image URL
            </p>
          )}
        </div>
      )}
    </div>
  );
}
