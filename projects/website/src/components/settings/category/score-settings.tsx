"use client";

import { ReplayViewers } from "@/common/replay-viewer";
import useDatabase from "@/hooks/use-database";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FaChartLine, FaPlay } from "react-icons/fa";
import { toast } from "sonner";
import { z } from "zod";
import { Form } from "../../ui/form";
import { SettingCard } from "../setting-card";
import { SettingSection } from "../setting-section";

const formSchema = z.object({
  replayViewer: z.string().min(1).max(32),
  showScoreComparison: z.boolean(),
});

const settings = [
  {
    id: "replay",
    title: "Replay Settings",
    icon: FaPlay,
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
  {
    id: "score",
    title: "Score Display",
    icon: FaChartLine,
    fields: [
      {
        name: "showScoreComparison",
        label: "Show Score Comparison",
        type: "checkbox",
        description:
          "Displays a score comparison between your score and the player you are viewing",
      },
    ],
  },
] as const;

const ScoreSettings = () => {
  const database = useDatabase();
  const replayViewer = useLiveQuery(async () =>
    (await database.getReplayViewer()).name.toLowerCase()
  );
  const showScoreComparison = useLiveQuery(() => database.getShowScoreComparison());

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      replayViewer: "",
      showScoreComparison: true,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const before = performance.now();
    await database.setReplayViewer(values.replayViewer);
    await database.setShowScoreComparison(values.showScoreComparison);
    const after = performance.now();

    toast("Settings saved", {
      description: `Your settings have been saved in ${(after - before).toFixed(0)}ms`,
    });
  }

  // Add onSubmit to the form instance
  (form as any).onSubmit = onSubmit;

  useEffect(() => {
    if (replayViewer === undefined || showScoreComparison === undefined) {
      return;
    }

    form.setValue("replayViewer", replayViewer);
    form.setValue("showScoreComparison", showScoreComparison);
  }, [replayViewer, form, showScoreComparison]);

  return (
    <div className="grid gap-6">
      <Form {...form}>
        <form className="space-y-6">
          {settings.map(section => (
            <SettingCard key={section.id}>
              <SettingSection
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

ScoreSettings.displayName = "ScoreSettings";

export default ScoreSettings;
