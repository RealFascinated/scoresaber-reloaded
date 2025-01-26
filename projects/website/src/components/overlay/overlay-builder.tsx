"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import useSettings from "@/hooks/use-settings";
import { Form, FormControl, FormDescription, FormItem, FormLabel } from "../ui/form";
import { FormField } from "@/components/ui/form";
import { Button } from "../ui/button";
import { Input } from "@/components/ui/input";
import { encodeOverlaySettings } from "@/common/overlay/overlay-settings";

const formSchema = z.object({
  playerId: z.string().min(1).max(32),
});

export default function OverlayBuilder() {
  const settings = useSettings();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      playerId: settings?.playerId || "",
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
  async function onSubmit({ playerId }: z.infer<typeof formSchema>) {
    window.open(
      `/overlay?settings=${encodeOverlaySettings({
        playerId: playerId,
      })}`,
      "_blank"
    );
  }

  return (
    <div className="flex flex-col gap-3 text-sm w-full h-full p-2 items-center">
      <p className="text-xl font-semibold">ScoreSaber Reloaded Overlay Builder</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-2">
          {/* Replay Viewer */}
          <FormField
            control={form.control}
            name="playerId"
            render={({ field }) => (
              <FormItem className="w-full sm:w-72">
                <FormLabel>Player ID</FormLabel>
                <FormDescription>The player ID of the player you want to use in the overlay.</FormDescription>
                <FormControl>
                  <Input placeholder="Player ID" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Saving Settings */}
          <Button type="submit" className="w-fit">
            Open Overlay
          </Button>
        </form>
      </Form>
    </div>
  );
}
