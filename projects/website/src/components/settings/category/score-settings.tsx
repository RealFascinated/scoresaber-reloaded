"use client";

import useDatabase from "@/hooks/use-database";
import { useSettingsForm } from "@/hooks/use-settings-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ReplayViewers } from "@ssr/common/replay-viewer";
import { Play } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Form } from "../../ui/form";
import { SettingSection } from "../setting-section";

const formSchema = z.object({
  replayViewer: z.string().min(1).max(32),
});

const settings = [
  {
    id: "replay",
    title: "Replay Settings",
    icon: Play,
    fields: [
      {
        name: "replayViewer",
        label: "Replay Viewer",
        type: "select",
        options: Object.entries(ReplayViewers).map(([id, viewer]) => ({
          value: id,
          label: viewer.name,
        })),
        description: "Choose which replay viewer to use when watching replays",
      },
    ],
  },
] as const;

const ScoreSettings = () => {
  const database = useDatabase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      replayViewer: "",
    },
  });

  // Sync form with database settings
  useSettingsForm(form, {
    replayViewer: async () => (await database.getReplayViewer()).name.toLowerCase(),
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const before = performance.now();
    await database.setReplayViewer(values.replayViewer);
    const after = performance.now();

    toast.success("Settings saved", {
      description: `Your settings have been saved in ${(after - before).toFixed(0)}ms`,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Form {...form}>
        <form className="flex flex-col gap-6">
          {settings.map(section => (
            <SettingSection
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

ScoreSettings.displayName = "ScoreSettings";

export default ScoreSettings;
