"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../../ui/form";
import { useToast } from "@/hooks/use-toast";
import useSettings from "@/hooks/use-settings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReplayViewers } from "@/common/replay-viewer";

const formSchema = z.object({
  replayViewer: z.string().min(1).max(32),
});

export default function ScoreSettings() {
  const settings = useSettings();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      replayViewer: settings?.getReplayViewerName() || "",
    },
  });

  if (!settings) {
    return;
  }

  /**
   * Handles the form submission
   *
   * @param replayViewer the new replay viewer
   */
  async function onSubmit({ replayViewer }: z.infer<typeof formSchema>) {
    settings.setReplayViewer(replayViewer);
    toast({
      title: "Settings saved",
      description: "Your settings have been saved.",
      variant: "success",
    });
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-2">
          {/* Replay Viewer */}
          <FormField
            control={form.control}
            name="replayViewer"
            render={({ field }) => (
              <FormItem className="w-full sm:w-72">
                <FormLabel>Replay Viewer</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={settings.getReplayViewerName()}
                  >
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

          {/* Saving Settings */}
          <Button type="submit" className="w-fit">
            Save
          </Button>
        </form>
      </Form>
    </div>
  );
}
