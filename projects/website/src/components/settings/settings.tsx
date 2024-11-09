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

const formSchema = z.object({
  backgroundCover: z.string().min(0).max(128),
});

export default function Settings() {
  const settings = useSettings();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  /**
   * Handles the form submission
   *
   * @param backgroundCover the new background cover
   */
  async function onSubmit({ backgroundCover }: z.infer<typeof formSchema>) {
    if (!settings) {
      return;
    }
    settings.setBackgroundImage(backgroundCover);
    toast({
      title: "Settings saved",
      description: "Your settings have been saved.",
      variant: "success",
    });
  }

  /**
   * Handle setting the default form values.
   */
  useEffect(() => {
    form.setValue("backgroundCover", settings?.backgroundCover || "");
  }, [settings, form]);

  return (
    <div className="flex flex-col gap-3">
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
                  <Input className="w-full sm:w-72 text-sm" placeholder="Hex or URL..." {...field} />
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
