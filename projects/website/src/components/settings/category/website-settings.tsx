"use client";

import { SettingIds, WebsiteLanding } from "@/common/database/database";
import { BACKGROUND_COVERS } from "@/components/background-cover";
import { Form } from "@/components/ui/form";
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
import { useDebounce } from "@uidotdev/usehooks";
import { ssrConfig } from "config";
import { useLiveQuery } from "dexie-react-hooks";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { Path, useForm } from "react-hook-form";
import { IconType } from "react-icons";
import { FaGlobe, FaImage, FaPalette, FaSnowflake } from "react-icons/fa";
import { toast } from "sonner";
import { z } from "zod";
import { SettingCard } from "../setting-card";
import { Field, SettingSection } from "../setting-section";

const formSchema = z.object({
  backgroundCover: z.string().min(0).max(128),
  snowParticles: z.boolean(),
  showKitty: z.boolean(),
  websiteLanding: z.nativeEnum(WebsiteLanding),
  theme: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

// Custom component for background cover control
const BackgroundCoverControl = (props: {
  field: {
    value: string | boolean;
    onChange: (value: string | boolean) => void;
    name?: string;
  };
}) => {
  const [customValue, setCustomValue] = useState("");
  const [selectedOption, setSelectedOption] = useState("default");
  const [isInitialized, setIsInitialized] = useState(false);
  const database = useDatabase();
  const previousDebouncedValue = useRef<string>("");

  // Debounce the custom value to prevent excessive database saves
  const debouncedCustomValue = useDebounce(customValue, 500);

  // Get both the selected option and custom value from database
  const backgroundCoverOption = useLiveQuery(async () => await database.getBackgroundCover());
  const customBackgroundCover = useLiveQuery(async () => await database.getCustomBackgroundCover());

  // Initialize state based on current values from database
  useEffect(() => {
    if (backgroundCoverOption !== undefined) {
      setSelectedOption(backgroundCoverOption);
    }
  }, [backgroundCoverOption]);

  useEffect(() => {
    if (customBackgroundCover !== undefined) {
      setCustomValue(customBackgroundCover);
    }
  }, [customBackgroundCover]);

  // Mark as initialized after both values are loaded
  useEffect(() => {
    if (backgroundCoverOption !== undefined && customBackgroundCover !== undefined) {
      setIsInitialized(true);
    }
  }, [backgroundCoverOption, customBackgroundCover]);

  // Save debounced custom value to database
  useEffect(() => {
    if (
      isInitialized &&
      selectedOption === "custom" &&
      debouncedCustomValue !== previousDebouncedValue.current &&
      debouncedCustomValue !== customBackgroundCover
    ) {
      previousDebouncedValue.current = debouncedCustomValue;
      database.setCustomBackgroundCover(debouncedCustomValue);
      props.field.onChange(debouncedCustomValue);
    }
  }, [debouncedCustomValue, isInitialized, selectedOption, customBackgroundCover]);

  const handleSelectChange = async (value: string) => {
    // Only save if component is initialized and value actually changed
    if (!isInitialized || value === selectedOption) return;

    setSelectedOption(value);

    if (value === "custom") {
      await database.setBackgroundCover("custom");
    } else {
      const cover = BACKGROUND_COVERS.find(c => c.id === value);
      const coverValue = cover?.value || value;
      await database.setBackgroundCover(value);
      props.field.onChange(coverValue);
    }
  };

  const handleCustomInputChange = (value: string) => {
    setCustomValue(value);
    // Don't save immediately - let the debounced effect handle it
  };

  return (
    <div>
      <Select onValueChange={handleSelectChange} value={selectedOption}>
        <SelectTrigger>
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

      {selectedOption === "custom" && (
        <Input
          placeholder="Enter a hex color or image URL..."
          value={customValue}
          onChange={e => handleCustomInputChange(e.target.value)}
          className="mt-2"
        />
      )}
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
        label: "Background Cover",
        type: "select" as const,
        description: "Change the background cover of the website",
        customControl: BackgroundCoverControl,
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
        description: "Choose which theme to use for the website",
        options: ssrConfig.themes.map(theme => ({ value: theme.id, label: theme.name })),
      },
    ],
  },
];

const WebsiteSettings = () => {
  const { setTheme, theme } = useTheme();
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
      theme: ssrConfig.themes[0].id,
    },
  });

  async function onSubmit(values: FormValues) {
    const before = performance.now();
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

  useEffect(() => {
    if (
      backgroundCover === undefined ||
      snowParticles === undefined ||
      showKitty === undefined ||
      websiteLanding === undefined ||
      theme === undefined
    ) {
      return;
    }

    // Only set values if they're different from current values
    const currentValues = form.getValues();

    // Don't set backgroundCover here - let the BackgroundCoverControl handle it
    if (currentValues.snowParticles !== snowParticles) {
      form.setValue("snowParticles", snowParticles);
    }
    if (currentValues.showKitty !== showKitty) {
      form.setValue("showKitty", showKitty);
    }
    if (currentValues.websiteLanding !== websiteLanding) {
      form.setValue("websiteLanding", websiteLanding);
    }
    if (currentValues.theme !== theme) {
      form.setValue("theme", theme);
    }
  }, [backgroundCover, snowParticles, showKitty, websiteLanding, theme, form]);

  return (
    <div className="grid gap-6">
      <Form {...form}>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
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
