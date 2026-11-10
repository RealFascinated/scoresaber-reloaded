"use client";

import { BACKGROUND_COVER_NONE } from "@/common/background-covers";
import { SettingIds, WebsiteLanding } from "@/common/database/database";
import { BackgroundCoverControl } from "@/components/settings/background-cover-control";
import { Form } from "@/components/ui/form";
import useDatabase from "@/hooks/use-database";
import { useSettingsForm } from "@/hooks/use-settings-form";
import { SharedIcons, type SharedDecorativeIcon } from "@/shared-icons";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Type, type Static } from "@sinclair/typebox";
import { ssrConfig } from "config";
import { useTheme } from "next-themes";
import { Path, useForm } from "react-hook-form";
import { Field, SettingSection } from "../setting-section";
import { SettingsCategorySkeleton } from "../settings-category-skeleton";
import { getMonotonicTimeMs, showSettingsSavedToast } from "../settings-feedback";

const formSchema = Type.Object({
  backgroundCover: Type.String({ maxLength: 128 }),
  backgroundCoverBrightness: Type.Number({ minimum: 0, maximum: 100 }),
  backgroundCoverBlur: Type.Number({ minimum: 0, maximum: 20 }),
  snowParticles: Type.Boolean(),
  showKitty: Type.Boolean(),
  websiteLanding: Type.Enum(WebsiteLanding),
  theme: Type.String(),
});

type FormValues = Static<typeof formSchema>;

const settings: {
  id: string;
  title: string;
  icon: SharedDecorativeIcon;
  fields: Field<FormValues, keyof FormValues>[];
}[] = [
  {
    id: "background",
    title: "Background",
    icon: SharedIcons.WebsiteCoverImageSettingsIcon,
    fields: [
      {
        name: "backgroundCover" as Path<FormValues>,
        label: "Background",
        type: "select" as const,
        customControl: BackgroundCoverControl,
      },
      {
        name: "backgroundCoverBrightness" as Path<FormValues>,
        label: "Background Brightness",
        type: "slider" as const,
        description: "Adjust the brightness of background images",
        min: 20,
        max: 100,
        step: 1,
      },
      {
        name: "backgroundCoverBlur" as Path<FormValues>,
        label: "Background Blur",
        type: "slider" as const,
        description: "Adjust the blur of background images",
        min: 0,
        max: 20,
        step: 1,
        labelFormatter: (value: number | undefined) => `${value}px`,
      },
    ],
  },
  {
    id: "effects",
    title: "Visual Effects",
    icon: SharedIcons.WebsiteSnowfallSettingsIcon,
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
    icon: SharedIcons.WebsiteGlobalSettingsIcon,
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
    icon: SharedIcons.WebsiteThemeSettingsIcon,
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
    resolver: typeboxResolver(formSchema),
    defaultValues: {
      backgroundCover: BACKGROUND_COVER_NONE,
      backgroundCoverBrightness: 50,
      backgroundCoverBlur: 6,
      snowParticles: false,
      showKitty: false,
      websiteLanding: WebsiteLanding.PLAYER_HOME,
      theme: ssrConfig.themes[0].id,
    },
  });

  const { isLoading } = useSettingsForm(form, {
    backgroundCover: () => database.getBackgroundCover(),
    backgroundCoverBrightness: () => database.getBackgroundCoverBrightness(),
    backgroundCoverBlur: () => database.getBackgroundCoverBlur(),
    snowParticles: () => database.getSnowParticles(),
    showKitty: () => database.getShowKitty(),
    websiteLanding: () => database.getWebsiteLanding(),
    theme: () => theme,
  });

  async function onSubmit(values: FormValues) {
    const before = getMonotonicTimeMs();
    await Promise.all([
      database.setBackgroundCover(values.backgroundCover),
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
