"use client";

import useDatabase from "@/hooks/use-database";
import { useSettingsForm } from "@/hooks/use-settings-form";
import { SharedIcons } from "@/shared-icons";
import { typeboxResolver } from "@hookform/resolvers/typebox";
import { Type, type Static } from "@sinclair/typebox";
import { ReplayViewers } from "@ssr/common/replay-viewer";
import { useForm } from "react-hook-form";
import { Form } from "../../ui/form";
import { SettingSection } from "../setting-section";
import { SettingsCategorySkeleton } from "../settings-category-skeleton";
import { showSettingsSavedToast } from "../settings-feedback";

const formSchema = Type.Object({
  replayViewer: Type.String({ minLength: 1, maxLength: 32 }),
});

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
  const database = useDatabase();

  const form = useForm<Static<typeof formSchema>>({
    resolver: typeboxResolver(formSchema),
    defaultValues: {
      replayViewer: "",
    },
  });

  // Sync form with database settings
  const { isLoading } = useSettingsForm(form, {
    replayViewer: () => database.getReplayViewer().then(viewer => viewer?.id ?? ""),
  });

  async function onSubmit(values: Static<typeof formSchema>) {
    const before = performance.now();
    await database.setReplayViewer(values.replayViewer);

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
