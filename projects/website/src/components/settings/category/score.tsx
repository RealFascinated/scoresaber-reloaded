"use client";

import { ReplayViewers } from "@/common/replay-viewer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useDatabase from "@/hooks/use-database";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../../ui/form";

const formSchema = z.object({
  replayViewer: z.string().min(1).max(32),
});

export default function ScoreSettings() {
  const database = useDatabase();
  const replayViewer = useLiveQuery(async () =>
    (await database.getReplayViewer()).name.toLowerCase()
  );

  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      replayViewer: "",
    },
  });

  useEffect(() => {
    if (replayViewer === undefined) {
      return;
    }

    form.setValue("replayViewer", replayViewer);
  }, [replayViewer, form]);

  /**
   * Handles the form submission
   *
   * @param replayViewer the new replay viewer
   */
  async function onSubmit({ replayViewer }: z.infer<typeof formSchema>) {
    await database.setReplayViewer(replayViewer);

    toast({
      title: "Settings saved",
      description: "Your settings have been saved.",
      variant: "success",
    });
  }

  return (
    <div className="flex flex-col gap-3 text-sm h-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col justify-between gap-2 h-full"
        >
          <div className="flex flex-col gap-2">
            {/* Replay Viewer */}
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
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Saving Settings */}
          <Button type="submit" className="w-fit">
            Save
          </Button>
        </form>
      </Form>
    </div>
  );
}
