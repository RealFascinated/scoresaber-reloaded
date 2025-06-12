"use client";

import { SettingIds } from "@/common/database/database";
import SimpleTooltip from "@/components/simple-tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import useDatabase from "@/hooks/use-database";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLiveQuery } from "dexie-react-hooks";
import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useForm } from "react-hook-form";
import { FaImage, FaSnowflake, FaUndo } from "react-icons/fa";
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
      <div className="flex flex-col gap-4 text-sm h-full">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col justify-between gap-4 h-full"
          >
            <div className="flex flex-col gap-6">
              {/* Background Cover */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-base font-medium">
                  <FaImage className="size-4" />
                  <h3>Background</h3>
                </div>
                <FormField
                  control={form.control}
                  name="backgroundCover"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Background Cover</FormLabel>
                      <FormControl>
                        <div className="flex gap-2 items-center">
                          <Input
                            className="w-full sm:w-72"
                            placeholder="Enter a hex color or image URL..."
                            {...field}
                          />
                          <SimpleTooltip display="Reset to default background">
                            <button
                              type="button"
                              className="cursor-pointer hover:text-primary transition-colors"
                              onClick={async () => {
                                field.onChange("https://cdn.fascinated.cc/assets/background.jpg");
                                await onSubmit(form.getValues());
                              }}
                            >
                              <FaUndo className="size-4" />
                            </button>
                          </SimpleTooltip>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Visual Effects */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-base font-medium">
                  <FaSnowflake className="size-4" />
                  <h3>Visual Effects</h3>
                </div>
                <div className="space-y-4">
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
                        <div className="space-y-1">
                          <FormLabel>Show Snow Particles</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Adds a festive snow effect to the background
                          </p>
                        </div>
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
                        <div className="space-y-1">
                          <FormLabel>Show Kitty</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Displays a cute kitty in the corner of the screen
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </form>
        </Form>
      </div>
    );
  }
);

WebsiteSettings.displayName = "WebsiteSettings";

export default WebsiteSettings;
