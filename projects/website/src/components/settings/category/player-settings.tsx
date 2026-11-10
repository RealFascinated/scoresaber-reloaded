"use client";

import { useSettingsForm } from "@/hooks/use-settings-form";
import { useUpdateUserPreferences } from "@/hooks/use-user-preferences";
import { SharedIcons } from "@/shared-icons";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { HistoryMode } from "@ssr/common/schemas/user/history-mode";
import { UserPreferencesSchema } from "@ssr/common/schemas/user/preferences";
import { Path, useForm } from "react-hook-form";
import { Type, type Static } from "typebox";
import { Form } from "../../ui/form";
import { SettingSection } from "../setting-section";
import { SettingsCategorySkeleton } from "../settings-category-skeleton";
import { getMonotonicTimeMs, showSettingsSavedToast } from "../settings-feedback";

const formSchema = Type.Pick(UserPreferencesSchema, ["historyMode"]);

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
  const { updateAsync } = useUpdateUserPreferences();

  const form = useForm<FormValues>({
    resolver: typeboxResolver(formSchema),
    defaultValues: {
      historyMode: HistoryMode.SIMPLE,
    },
  });

  const { isLoading } = useSettingsForm(form, preferences => ({
    historyMode: preferences.historyMode,
  }));

  async function onSubmit(values: FormValues) {
    const before = getMonotonicTimeMs();
    await updateAsync({ historyMode: values.historyMode as HistoryMode });
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
