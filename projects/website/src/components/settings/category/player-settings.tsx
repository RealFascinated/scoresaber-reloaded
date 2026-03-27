"use client";

import { HistoryMode } from "@/common/player/history-mode";
import useDatabase from "@/hooks/use-database";
import { useSettingsForm } from "@/hooks/use-settings-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { History } from "lucide-react";
import { Path, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Form } from "../../ui/form";
import { SettingSection } from "../setting-section";

const formSchema = z.object({
  historyMode: z.string().min(1).max(32),
});

type FormValues = z.infer<typeof formSchema>;

const settings = [
  {
    id: "historyMode",
    title: "History Mode",
    icon: History,
    fields: [
      {
        name: "historyMode" as Path<FormValues>,
        label: "History Mode",
        type: "select" as const,
        description: "Choose which history mode to use",
        options: [
          { value: HistoryMode.ADVANCED, label: "Advanced" },
          { value: HistoryMode.SIMPLE, label: "Simple" },
        ],
      },
    ],
  },
] as const;

const PlayerSettings = () => {
  const database = useDatabase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      historyMode: HistoryMode.SIMPLE,
    },
  });

  // Sync form with database settings
  useSettingsForm(form, {
    historyMode: () => database.getHistoryMode(),
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const before = performance.now();
    await database.setHistoryMode(values.historyMode as HistoryMode);
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

PlayerSettings.displayName = "PlayerSettings";

export default PlayerSettings;
