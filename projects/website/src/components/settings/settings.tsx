"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../ui/form";
import { Input } from "../ui/input";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import useSettings from "@/hooks/use-settings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReplayViewers } from "@/common/replay-viewer";

const formSchema = z.object({
  backgroundCover: z.string().min(0).max(128),
  replayViewer: z.string().min(1).max(32),
});

export default function Settings() {
  const settings = useSettings();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      backgroundCover: settings?.backgroundCover || "",
      replayViewer: settings?.getReplayViewerName() || "",
    },
  });

  if (!settings) {
    return;
  }

  /**
   * Handles the form submission
   *
   * @param backgroundCover the new background cover
   * @param replayViewer the new replay viewer
   */
  async function onSubmit({ backgroundCover, replayViewer }: z.infer<typeof formSchema>) {
    settings.setBackgroundImage(backgroundCover);
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
          {/* Background Cover */}
          <FormField
            control={form.control}
            name="backgroundCover"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Background Cover</FormLabel>
                <FormControl>
                  <Input className="w-full sm:w-72" placeholder="Hex or URL..." {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Background Cover */}
          <FormField
            control={form.control}
            name="replayViewer"
            render={({ field }) => (
              <FormItem className="w-full sm:w-72">
                <FormLabel>Replay Viewer</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={settings.getReplayViewerName()}>
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
