"use client";

import { SettingIds, WebsiteLanding } from "@/common/database/database";
import { BACKGROUND_COVERS } from "@/components/background-cover";
import { Form, FormDescription, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBackgroundCover } from "@/hooks/use-background-cover";
import useDatabase from "@/hooks/use-database";
import { useSettingsForm } from "@/hooks/use-settings-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ssrConfig } from "config";
import { useTheme } from "next-themes";
import { Path, useForm } from "react-hook-form";
import { IconType } from "react-icons";
import { FaGlobe, FaImage, FaPalette, FaSnowflake } from "react-icons/fa";
import { toast } from "sonner";
import { z } from "zod";
import { Field, SettingSection } from "../setting-section";

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
    <div className="flex flex-col space-y-2 md:flex-row md:items-start md:justify-between md:space-y-0">
      <div className="flex-1 space-y-0 md:pr-4">
        <FormLabel className="text-sm leading-tight font-normal">Background Cover</FormLabel>
        <FormDescription className="text-xs leading-tight">Change the background cover of the website</FormDescription>
        {selectedOption === "custom" && (
          <Input
            placeholder="Hex color or image URL"
            value={customValue}
            onChange={e => handleCustomInputChange(e.target.value)}
            className="mt-2 h-8 w-full text-xs md:w-2xl"
          />
        )}
      </div>
      <Select onValueChange={handleSelectChange} value={selectedOption}>
        <SelectTrigger className="w-full md:w-52">
          <SelectValue placeholder="Select a background cover" />
        </SelectTrigger>
        <SelectContent>
          {Object.values(BACKGROUND_COVERS).map(cover => (
            <SelectItem key={cover.id} value={cover.id}>
              {cover.name}
            </SelectItem>
          ))}
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

const settings: {
  id: string;
  title: string;
  icon: IconType;
  fields: Field<FormValues, keyof FormValues>[];
}[] = [
  {
    id: "background",
    title: "Background",
    icon: FaImage,
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
    icon: FaSnowflake,
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
    icon: FaGlobe,
    fields: [
      {
        name: "websiteLanding" as Path<FormValues>,
        label: "Default Landing Page",
        type: "select" as const,
        description: "Choose which page to show when first visiting the website",
        options: [
          { value: WebsiteLanding.PLAYER_HOME, label: "Player Home" },
          { value: WebsiteLanding.LANDING, label: "Website Landing" },
        ],
      },
    ],
  },
  {
    id: "theme",
    title: "Theme",
    icon: FaPalette,
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
  useSettingsForm(
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
    const before = performance.now();
    await database.setBackgroundCoverBrightness(values.backgroundCoverBrightness);
    await database.setBackgroundCoverBlur(values.backgroundCoverBlur);
    await database.setSetting(SettingIds.SnowParticles, values.snowParticles);
    await database.setSetting(SettingIds.ShowKitty, values.showKitty);
    await database.setWebsiteLanding(values.websiteLanding);
    setTheme(values.theme);

    const after = performance.now();
    toast.success("Settings saved", {
      description: `Your settings have been saved in ${(after - before).toFixed(0)}ms`,
    });
  }

  // Add onSubmit to the form instance
  (form as any).onSubmit = onSubmit;

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          {settings.map(section => (
            <SettingSection<FormValues>
              key={section.id}
              title={section.title}
              icon={section.icon}
              fields={section.fields}
              form={form}
            />
          ))}
        </form>
      </Form>
    </div>
  );
};

WebsiteSettings.displayName = "WebsiteSettings";

export default WebsiteSettings;
