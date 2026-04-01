"use client";

import { HistoryMode } from "@/common/player/history-mode";
import useDatabase from "@/hooks/use-database";
import { useSettingsForm } from "@/hooks/use-settings-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { History } from "lucide-react";
import { Path, useForm } from "react-hook-form";
import { z } from "zod";
import { Form } from "../../ui/form";
import { SettingSection } from "../setting-section";
import { SettingsCategorySkeleton } from "../settings-category-skeleton";
import { getMonotonicTimeMs, showSettingsSavedToast } from "../settings-feedback";

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
    resolver: zodResolver(formSchema, { reportInput: true }),
    defaultValues: {
      historyMode: HistoryMode.SIMPLE,
    },
  });

  // Sync form with database settings
  const { isLoading } = useSettingsForm(form, {
    historyMode: () => database.getHistoryMode(),
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const before = getMonotonicTimeMs();
    await database.setHistoryMode(values.historyMode as HistoryMode);
    showSettingsSavedToast(before);
  }

  if (isLoading) {
    return <SettingsCategorySkeleton />;
  }

  return (
    <div className="flex flex-col gap-8">
      <Form {...form}>
        <form className="flex flex-col gap-8">
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
