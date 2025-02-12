"use client";

import { SettingIds } from "@/common/database/database";
import Tooltip from "@/components/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import useDatabase from "@/hooks/use-database";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLiveQuery } from "dexie-react-hooks";
import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useForm } from "react-hook-form";
import { FaUndo } from "react-icons/fa";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
  backgroundCover: z.string().min(0).max(128),
  snowParticles: z.boolean(),
  showKitty: z.boolean(),
});

// Create a separate component variable
const WebsiteSettings = forwardRef<{ submit: () => void }, { onSave: () => void }>(
  ({ onSave }, formRef) => {
    const database = useDatabase();
    const backgroundCover = useLiveQuery(async () => await database.getBackgroundCover());
    const snowParticles = useLiveQuery(async () => await database.getSnowParticles());
    const showKitty = useLiveQuery(async () => await database.getShowKitty());

    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        backgroundCover: backgroundCover || "",
        snowParticles: snowParticles ?? false,
        showKitty: showKitty ?? false,
      },
    });

    useEffect(() => {
      if (backgroundCover === undefined || snowParticles === undefined || showKitty === undefined) {
        return;
      }

      form.setValue("backgroundCover", backgroundCover);
      form.setValue("snowParticles", snowParticles);
      form.setValue("showKitty", showKitty);
    }, [backgroundCover, snowParticles, showKitty, form]);

    /**
     * Handles the form submission
     *
     * @param backgroundCover the new background cover
     * @param replayViewer the new replay viewer
     */
    async function onSubmit({
      backgroundCover,
      snowParticles,
      showKitty,
    }: z.infer<typeof formSchema>) {
      await database.setSetting(SettingIds.BackgroundCover, backgroundCover);
      await database.setSetting(SettingIds.SnowParticles, snowParticles);
      await database.setSetting(SettingIds.ShowKitty, showKitty);

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
      <div className="flex flex-col gap-3 text-sm h-full">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col justify-between gap-2 h-full"
          >
            <div className="flex flex-col gap-2">
              {/* Background Cover */}
              <FormField
                control={form.control}
                name="backgroundCover"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Background Cover</FormLabel>
                    <FormControl>
                      <div className="flex gap-2 items-center">
                        <Input className="w-full sm:w-72" placeholder="Hex or URL..." {...field} />
                        <Tooltip display={<p>Reset to default</p>}>
                          <button
                            type="button"
                            className="cursor-pointer"
                            onClick={async () => {
                              field.onChange("/assets/background.jpg");
                              await onSubmit(form.getValues());
                            }}
                          >
                            <FaUndo className="size-4" />
                          </button>
                        </Tooltip>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Snow Particles */}
              <FormField
                control={form.control}
                name="snowParticles"
                render={({ field }) => (
                  <FormItem className="flex items-center space-y-0 gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={checked => field.onChange(checked)}
                      />
                    </FormControl>
                    <FormLabel>Show Snow Particles</FormLabel>
                  </FormItem>
                )}
              />

              {/* Show Kitty */}
              <FormField
                control={form.control}
                name="showKitty"
                render={({ field }) => (
                  <FormItem className="flex items-center space-y-0 gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={checked => field.onChange(checked)}
                      />
                    </FormControl>
                    <FormLabel>Show Kitty</FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </div>
    );
  }
);

WebsiteSettings.displayName = "WebsiteSettings";

export default WebsiteSettings;
