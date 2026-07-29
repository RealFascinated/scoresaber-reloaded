"use client";

import { SettingIds, WebsiteLanding } from "@/common/database/database";
import { Form } from "@/components/ui/form";
import useDatabase from "@/hooks/use-database";
import { useSettingsForm } from "@/hooks/use-settings-form";
import { SharedIcons, type SharedDecorativeIcon } from "@/shared-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { ssrConfig } from "config";
import { useTheme } from "next-themes";
import { Path, useForm } from "react-hook-form";
import { z } from "zod";
import { Field, SettingSection } from "../setting-section";
import { SettingsCategorySkeleton } from "../settings-category-skeleton";
import { getMonotonicTimeMs, showSettingsSavedToast } from "../settings-feedback";

const formSchema = z.object({
  snowParticles: z.boolean(),
  showKitty: z.boolean(),
  websiteLanding: z.nativeEnum(WebsiteLanding),
  theme: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const settings: {
  id: string;
  title: string;
  icon: SharedDecorativeIcon;
  fields: Field<FormValues, keyof FormValues>[];
}[] = [
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
    resolver: zodResolver(formSchema, { reportInput: true }),
    defaultValues: {
      snowParticles: false,
      showKitty: false,
      websiteLanding: WebsiteLanding.PLAYER_HOME,
      theme: ssrConfig.themes[0].id,
    },
  });

  const { isLoading } = useSettingsForm(form, {
    snowParticles: () => database.getSnowParticles(),
    showKitty: () => database.getShowKitty(),
    websiteLanding: () => database.getWebsiteLanding(),
    theme: () => theme,
  });

  async function onSubmit(values: FormValues) {
    const before = getMonotonicTimeMs();
    await Promise.all([
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
