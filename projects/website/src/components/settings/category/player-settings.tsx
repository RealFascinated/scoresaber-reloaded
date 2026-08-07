"use client";

import { HistoryMode } from "@/common/player/history-mode";
import useDatabase from "@/hooks/use-database";
import { useSettingsForm } from "@/hooks/use-settings-form";
import { SharedIcons } from "@/shared-icons";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Type, type Static } from "@sinclair/typebox";
import { Path, useForm } from "react-hook-form";
import { Form } from "../../ui/form";
import { SettingSection } from "../setting-section";
import { SettingsCategorySkeleton } from "../settings-category-skeleton";
import { getMonotonicTimeMs, showSettingsSavedToast } from "../settings-feedback";

const formSchema = Type.Object({
  historyMode: Type.String({ minLength: 1, maxLength: 32 }),
});

type FormValues = Static<typeof formSchema>;

const settings = [
  {
    id: "historyMode",
    title: "History Mode",
    icon: SharedIcons.PlayerHistorySettingsIcon,
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

  const form = useForm<FormValues>({
    resolver: typeboxResolver(formSchema),
    defaultValues: {
      historyMode: HistoryMode.SIMPLE,
    },
  });

  // Sync form with database settings
  const { isLoading } = useSettingsForm(form, {
    historyMode: () => database.getHistoryMode(),
  });

  async function onSubmit(values: FormValues) {
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
