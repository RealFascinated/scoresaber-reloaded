"use client";

import { ReplayViewers } from "@/common/replay-viewer";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useDatabase from "@/hooks/use-database";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLiveQuery } from "dexie-react-hooks";
import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useForm } from "react-hook-form";
import { FaChartLine, FaPlay } from "react-icons/fa";
import { toast } from "sonner";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../../ui/form";

const formSchema = z.object({
  replayViewer: z.string().min(1).max(32),
  showScoreComparison: z.boolean(),
});

const ScoreSettings = forwardRef<{ submit: () => void }, { onSave: () => void }>(
  ({ onSave }, formRef) => {
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

    useEffect(() => {
      if (replayViewer === undefined || showScoreComparison === undefined) {
        return;
      }

      form.setValue("replayViewer", replayViewer);
      form.setValue("showScoreComparison", showScoreComparison);
    }, [replayViewer, form, showScoreComparison]);

    /**
     * Handles the form submission
     *
     * @param replayViewer the new replay viewer
     */
    async function onSubmit({ replayViewer, showScoreComparison }: z.infer<typeof formSchema>) {
      await database.setReplayViewer(replayViewer);
      await database.setShowScoreComparison(showScoreComparison);

      toast("Settings saved", {
        description: "Your settings have been saved.",
      });
    }

    // Expose a submit method
    useImperativeHandle(formRef, () => ({
      submit: () => {
        form.handleSubmit(onSubmit)(); // Call the form submission
      },
    }));

    return (
      <div className="flex flex-col gap-4 text-sm h-full">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col justify-between gap-4 h-full"
          >
            <div className="flex flex-col gap-6">
              {/* Replay Settings */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-base font-medium">
                  <FaPlay className="size-4" />
                  <h3>Replay Settings</h3>
                </div>
                {replayViewer && (
                  <FormField
                    control={form.control}
                    name="replayViewer"
                    render={({ field }) => (
                      <FormItem className="w-full sm:w-72">
                        <FormLabel>Replay Viewer</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={replayViewer}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a replay viewer to use" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(ReplayViewers).map(([id, viewer]) => {
                                return (
                                  <SelectItem key={id} value={id}>
                                    {viewer.name}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">
                          Choose which replay viewer to use when watching replays
                        </p>
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Score Display */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-base font-medium">
                  <FaChartLine className="size-4" />
                  <h3>Score Display</h3>
                </div>
                <FormField
                  control={form.control}
                  name="showScoreComparison"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-y-0 gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={checked => field.onChange(checked)}
                        />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel>Show Score Comparison</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Displays a comparison between your score and the top score
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </form>
        </Form>
      </div>
    );
  }
);

ScoreSettings.displayName = "ScoreSettings";

export default ScoreSettings;
