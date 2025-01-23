"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import useSettings from "@/hooks/use-settings";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  backgroundCover: z.string().min(0).max(128),
  snowParticles: z.boolean(),
});

export default function WebsiteSettings() {
  const settings = useSettings();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      backgroundCover: settings?.backgroundCover || "",
      snowParticles: settings?.getSnowParticles(),
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
  async function onSubmit({ backgroundCover, snowParticles }: z.infer<typeof formSchema>) {
    settings.setBackgroundImage(backgroundCover);
    settings.setSnowParticles(snowParticles);

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
            name="snowParticles"
            render={({ field }) => (
              <FormItem className="flex items-center  space-y-0 gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel>Show Snow Particles</FormLabel>
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
