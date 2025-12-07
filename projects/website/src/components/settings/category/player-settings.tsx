"use client";

import { HistoryMode } from "@/common/player/history-mode";
import useDatabase from "@/hooks/use-database";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { Path, useForm } from "react-hook-form";
import { FaHistory } from "react-icons/fa";
import { toast } from "sonner";
import { z } from "zod";
import { Form } from "../../ui/form";
import { SettingCard } from "../setting-card";
import { SettingSection } from "../setting-section";

const formSchema = z.object({
  historyMode: z.string().min(1).max(32),
});

type FormValues = z.infer<typeof formSchema>;

const settings = [
  {
    id: "historyMode",
    title: "History Mode",
    icon: FaHistory,
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

const ScoreSettings = () => {
  const database = useDatabase();
  const historyMode = useLiveQuery(() => database.getHistoryMode());

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      historyMode: HistoryMode.SIMPLE,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const before = performance.now();
    await database.setHistoryMode(values.historyMode as HistoryMode);
    const after = performance.now();

    toast.success("Settings saved", {
      description: `Your settings have been saved in ${(after - before).toFixed(0)}ms`,
    });
  }

  // Add onSubmit to the form instance
  (form as any).onSubmit = onSubmit;

  useEffect(() => {
    if (historyMode === undefined) {
      return;
    }

    form.setValue("historyMode", historyMode);
  }, [historyMode, form]);

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
