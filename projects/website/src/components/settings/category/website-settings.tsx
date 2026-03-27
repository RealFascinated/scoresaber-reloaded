"use client";

import { SettingIds, WebsiteLanding } from "@/common/database/database";
import { BACKGROUND_COVERS } from "@/components/background-cover";
import { Form, FormDescription, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useBackgroundCover } from "@/hooks/use-background-cover";
import useDatabase from "@/hooks/use-database";
import { useSettingsForm } from "@/hooks/use-settings-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ssrConfig } from "config";
import type { LucideIcon } from "lucide-react";
import { Globe, Image as ImageIcon, Palette, Snowflake } from "lucide-react";
import { useTheme } from "next-themes";
import { Path, useForm } from "react-hook-form";
import { z } from "zod";
import { Field, SettingSection } from "../setting-section";
import { SettingsCategorySkeleton } from "../settings-category-skeleton";
import { getMonotonicTimeMs, showSettingsSavedToast } from "../settings-feedback";

const formSchema = z.object({
  backgroundCover: z.string().min(0).max(128),
  backgroundCoverBrightness: z.number().min(0).max(100),
  backgroundCoverBlur: z.number().min(0).max(100),
  snowParticles: z.boolean(),
  showKitty: z.boolean(),
  websiteLanding: z.nativeEnum(WebsiteLanding),
  theme: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const BackgroundCoverControl = (props: {
  field: {
    value: string | number | boolean;
    onChange: (value: string | number | boolean) => void;
    name?: string;
  };
}) => {
  const { selectedOption, customValue, handleSelectChange, handleCustomInputChange } = useBackgroundCover(
    props.field.onChange
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="w-full min-w-0">
        <FormLabel className="text-foreground text-[15px] leading-snug font-medium">
          Background Cover
        </FormLabel>
        <FormDescription className="text-muted-foreground mt-1 text-[13px] leading-snug">
          Change the background cover of the website
        </FormDescription>
        {selectedOption === "custom" && (
          <Input
            placeholder="Hex color or image URL"
            value={customValue}
            onChange={e => handleCustomInputChange(e.target.value)}
            className="mt-2 h-8 w-full max-w-xl text-xs"
          />
        )}
      </div>
      <div className="w-full min-w-0">
        <RadioGroup
          value={selectedOption}
          onValueChange={handleSelectChange}
          className="flex max-h-[min(320px,50vh)] flex-col gap-2 overflow-y-auto pr-1"
        >
          {Object.values(BACKGROUND_COVERS).map(cover => {
            const id = `background-cover-${cover.id}`;
            return (
              <div key={cover.id} className="flex items-center gap-2.5">
                <RadioGroupItem value={cover.id} id={id} />
                <Label htmlFor={id} className="cursor-pointer text-[15px] leading-snug font-normal">
                  {cover.name}
                </Label>
              </div>
            );
          })}
          <div className="flex items-center gap-2.5">
            <RadioGroupItem value="custom" id="background-cover-custom" />
            <Label
              htmlFor="background-cover-custom"
              className="cursor-pointer text-[15px] leading-snug font-normal"
            >
              Custom
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};

const settings: {
  id: string;
  title: string;
  icon: LucideIcon;
  fields: Field<FormValues, keyof FormValues>[];
}[] = [
  {
    id: "background",
    title: "Background",
    icon: ImageIcon,
    fields: [
      {
        name: "backgroundCover" as Path<FormValues>,
        label: "",
        type: "select" as const,
        customControl: BackgroundCoverControl,
      },
      {
        name: "backgroundCoverBrightness" as Path<FormValues>,
        label: "Background Cover Brightness",
        type: "slider" as const,
        description: "Adjust the brightness of the background cover",
        min: 20,
        max: 100,
        step: 1,
      },
      {
        name: "backgroundCoverBlur" as Path<FormValues>,
        label: "Background Cover Blur",
        type: "slider" as const,
        description: "Adjust the blur of the background cover",
        min: 0,
        max: 10,
        step: 1,
        labelFormatter: (value: number | undefined) => `${value}px`,
      },
    ],
  },
  {
    id: "effects",
    title: "Visual Effects",
    icon: Snowflake,
    fields: [
      {
        name: "snowParticles" as Path<FormValues>,
        label: "Show Snow Particles",
        type: "checkbox" as const,
        description: "Adds a festive snow effect to the background",
      },
      {
        name: "showKitty" as Path<FormValues>,
        label: "Show Kitty",
        type: "checkbox" as const,
        description: "Adds a cute kitty that follows your cursor around the screen",
      },
    ],
  },
  {
    id: "navigation",
    title: "Navigation",
    icon: Globe,
    fields: [
      {
        name: "websiteLanding" as Path<FormValues>,
        label: "Default Landing Page",
        type: "select" as const,
        description: "Choose which page to show when first visiting the website",
        options: [
          { value: WebsiteLanding.PLAYER_HOME, label: "Player Home" },
          { value: WebsiteLanding.LANDING, label: "Website Landing" },
          { value: WebsiteLanding.PLAYER_PAGE, label: "Player Page" },
        ],
      },
    ],
  },
  {
    id: "theme",
    title: "Theme",
    icon: Palette,
    fields: [
      {
        name: "theme" as Path<FormValues>,
        label: "Theme",
        type: "select" as const,
        description: "Choose which color theme to use for the website",
        options: ssrConfig.themes.map(theme => ({ value: theme.id, label: theme.name })),
      },
    ],
  },
];

const WebsiteSettings = () => {
  const { setTheme, theme } = useTheme();
  const database = useDatabase();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      backgroundCover: "",
      backgroundCoverBrightness: 50,
      backgroundCoverBlur: 6,
      snowParticles: false,
      showKitty: false,
      websiteLanding: WebsiteLanding.PLAYER_HOME,
      theme: ssrConfig.themes[0].id,
    },
  });

  // Sync form with database settings
  const { isLoading } = useSettingsForm(
    form,
    {
      backgroundCover: () => database.getBackgroundCover(),
      backgroundCoverBrightness: () => database.getBackgroundCoverBrightness(),
      backgroundCoverBlur: () => database.getBackgroundCoverBlur(),
      snowParticles: () => database.getSnowParticles(),
      showKitty: () => database.getShowKitty(),
      websiteLanding: () => database.getWebsiteLanding(),
      theme: () => theme,
    },
    ["backgroundCover"] // Exclude backgroundCover - let BackgroundCoverControl handle it
  );

  async function onSubmit(values: FormValues) {
    const before = getMonotonicTimeMs();
    await Promise.all([
      database.setBackgroundCoverBrightness(values.backgroundCoverBrightness),
      database.setBackgroundCoverBlur(values.backgroundCoverBlur),
      database.setSetting(SettingIds.SnowParticles, values.snowParticles),
      database.setSetting(SettingIds.ShowKitty, values.showKitty),
      database.setWebsiteLanding(values.websiteLanding),
    ]);
    setTheme(values.theme);

    showSettingsSavedToast(before);
  }

  if (isLoading) {
    return <SettingsCategorySkeleton />;
  }

  return (
    <div className="flex flex-col gap-8">
      <Form {...form}>
        <form className="flex flex-col gap-8" onSubmit={form.handleSubmit(onSubmit)}>
          {settings.map(section => (
            <SettingSection<FormValues>
              key={section.id}
              title={section.title}
              icon={section.icon}
              fields={section.fields}
              form={form}
              onFormSubmit={onSubmit}
            />
          ))}
        </form>
      </Form>
    </div>
  );
};

WebsiteSettings.displayName = "WebsiteSettings";

export default WebsiteSettings;
