"use client";

import { authClient } from "@/common/auth/auth-client";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { env } from "@ssr/common/env";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import Link from "next/link";
import { forwardRef, useImperativeHandle } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Form } from "../../ui/form";

const formSchema = z.object({
  replayViewer: z.string().min(1).max(32),
});

const AccountSettings = forwardRef<{ submit: () => void }, { onSave: () => void }>(
  ({ onSave }, formRef) => {
    const { data: session, refetch } = authClient.useSession();

    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        replayViewer: "",
      },
    });

    /**
     * Handles the form submission
     *
     * @param replayViewer the new replay viewer
     */
    async function onSubmit({ replayViewer }: z.infer<typeof formSchema>) {
      toast("Account Saved", {
        description: "Your account has been saved.",
      });
    }

    // Expose a submit method
    useImperativeHandle(formRef, () => ({
      submit: () => {
        form.handleSubmit(onSubmit)(); // Call the form submission
      },
    }));

    /**
     * Handles the Steam unlink.
     */
    async function handleSteamUnlink() {
      await ssrApi.unlinkSteamAccount();
      refetch();
    }

    return (
      <div className="flex flex-col gap-3 text-sm h-full">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col justify-between gap-2 h-full"
          >
            {session?.session ? (
              <div className="flex flex-col gap-2">
                {/* Steam Auth Button */}
                {session?.user.steamId ? (
                  <Button
                    variant="outline"
                    className="w-fit"
                    type="button"
                    onClick={handleSteamUnlink}
                  >
                    Unlink Steam Account
                  </Button>
                ) : (
                  <Link href={`${env.NEXT_PUBLIC_API_URL}/user/link/steam`} prefetch={false}>
                    <Button variant="outline" className="w-fit" type="button">
                      Link Steam Account
                    </Button>
                  </Link>
                )}

                {/* Current Steam Account */}
                <div className="text-sm text-muted-foreground">
                  {session?.user.steamId ? (
                    <>
                      Currently linked to{" "}
                      <Link
                        href={`https://steamcommunity.com/id/${session.user.steamId}`}
                        target="_blank"
                        className="text-ssr hover:opacity-80 transform-gpu transition-all"
                      >
                        <span className="font-bold">{session.user.steamId}</span>
                      </Link>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No Steam account linked</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 items-center h-full">
                <p className="text-sm text-muted-foreground">You are not logged in</p>
                <a href="/auth/login">
                  <Button variant="outline" className="w-fit" type="button">
                    Login
                  </Button>
                </a>
              </div>
            )}
          </form>
        </Form>
      </div>
    );
  }
);

AccountSettings.displayName = "AccountSettings";

export default AccountSettings;
