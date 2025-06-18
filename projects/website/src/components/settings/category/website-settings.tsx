"use client";

import { SettingIds, WebsiteLanding } from "@/common/database/database";
import SimpleTooltip from "@/components/simple-tooltip";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import useDatabase from "@/hooks/use-database";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { Path, useForm } from "react-hook-form";
import { IconType } from "react-icons";
import { FaGlobe, FaImage, FaSnowflake, FaUndo } from "react-icons/fa";
import { toast } from "sonner";
import { z } from "zod";
import { SettingCard } from "../setting-card";
import { Field, SettingSection } from "../setting-section";

const formSchema = z.object({
  backgroundCover: z.string().min(0).max(128),
  snowParticles: z.boolean(),
  showKitty: z.boolean(),
  websiteLanding: z.nativeEnum(WebsiteLanding),
});

type FormValues = z.infer<typeof formSchema>;

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
        label: "Background Cover",
        type: "text" as const,
        description: "Set a custom background color or image URL",
        customControl: (props: {
          field: {
            value: string | boolean;
            onChange: (value: string | boolean) => void;
            name?: string;
          };
        }) => (
          <div className="flex gap-2">
            <Input
              placeholder="Enter a hex color or image URL..."
              value={props.field.value as string}
              onChange={e => props.field.onChange(e.target.value as string)}
            />
            <SimpleTooltip display="Reset to default background">
              <button
                type="button"
                className="hover:bg-secondary/50 rounded-md p-2 transition-colors"
                onClick={async () => {
                  props.field.onChange("https://cdn.fascinated.cc/assets/background.jpg");
                  toast("Background cover reset to default");
                }}
              >
                <FaUndo className="size-4" />
              </button>
            </SimpleTooltip>
          </div>
        ),
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
];

const WebsiteSettings = () => {
  const database = useDatabase();
  const backgroundCover = useLiveQuery(async () => await database.getBackgroundCover());
  const snowParticles = useLiveQuery(async () => await database.getSnowParticles());
  const showKitty = useLiveQuery(async () => await database.getShowKitty());
  const websiteLanding = useLiveQuery(async () => await database.getWebsiteLanding());

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      backgroundCover: "",
      snowParticles: false,
      showKitty: false,
      websiteLanding: WebsiteLanding.PLAYER_HOME,
    },
  });

  async function onSubmit(values: FormValues) {
    const before = performance.now();
    await database.setSetting(SettingIds.BackgroundCover, values.backgroundCover);
    await database.setSetting(SettingIds.SnowParticles, values.snowParticles);
    await database.setSetting(SettingIds.ShowKitty, values.showKitty);
    await database.setWebsiteLanding(values.websiteLanding);

    const after = performance.now();
    toast("Settings saved", {
      description: `Your settings have been saved in ${(after - before).toFixed(0)}ms`,
    });
  }

  // Add onSubmit to the form instance
  (form as any).onSubmit = onSubmit;

  useEffect(() => {
    if (
      backgroundCover === undefined ||
      snowParticles === undefined ||
      showKitty === undefined ||
      websiteLanding === undefined
    ) {
      return;
    }

    // Only set values if they're different from current values
    const currentValues = form.getValues();
    if (currentValues.backgroundCover !== backgroundCover) {
      form.setValue("backgroundCover", backgroundCover);
    }
    if (currentValues.snowParticles !== snowParticles) {
      form.setValue("snowParticles", snowParticles);
    }
    if (currentValues.showKitty !== showKitty) {
      form.setValue("showKitty", showKitty);
    }
    if (currentValues.websiteLanding !== websiteLanding) {
      form.setValue("websiteLanding", websiteLanding);
    }
  }, [backgroundCover, snowParticles, showKitty, websiteLanding, form]);

  return (
    <div className="grid gap-6">
      <Form {...form}>
        <form className="space-y-6">
          {settings.map(section => (
            <SettingCard key={section.id}>
              <SettingSection<FormValues>
                title={section.title}
                icon={section.icon}
                fields={section.fields}
                form={form}
              />
            </SettingCard>
          ))}
        </form>
      </Form>
    </div>
  );
};

WebsiteSettings.displayName = "WebsiteSettings";

export default WebsiteSettings;
