"use client";

import { useSettingsForm } from "@/hooks/use-settings-form";
import { useUpdateUserPreferences } from "@/hooks/use-user-preferences";
import { SharedIcons } from "@/shared-icons";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { ReplayViewers } from "@ssr/common/replay-viewer";
import { DEFAULT_USER_PREFERENCES, UserPreferencesSchema } from "@ssr/common/schemas/user/preferences";
import { useForm } from "react-hook-form";
import { Type, type Static } from "typebox";
import { Form } from "../../ui/form";
import { SettingSection } from "../setting-section";
import { SettingsCategorySkeleton } from "../settings-category-skeleton";
import { showSettingsSavedToast } from "../settings-feedback";

const formSchema = Type.Pick(UserPreferencesSchema, ["replayViewer"]);

const settings = [
  {
    id: "replay",
    title: "Replay Settings",
    icon: SharedIcons.OpenReplayOnScorePageSettingsIcon,
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
  const { updateAsync } = useUpdateUserPreferences();

  const form = useForm<Static<typeof formSchema>>({
    resolver: typeboxResolver(formSchema),
    defaultValues: {
      replayViewer: DEFAULT_USER_PREFERENCES.replayViewer,
    },
  });

  const { isLoading } = useSettingsForm(form, preferences => ({
    replayViewer: preferences.replayViewer,
  }));

  async function onSubmit(values: Static<typeof formSchema>) {
    const before = performance.now();
    await updateAsync({ replayViewer: values.replayViewer });

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

ScoreSettings.displayName = "ScoreSettings";

export default ScoreSettings;
