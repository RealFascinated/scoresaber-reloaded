import { auth } from "@ssr/common/auth/auth";
import { env } from "@ssr/common/env";
import type { BetterAuthClientPlugin } from "better-auth";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { steamAuthPlugin } from "./plugin/steam-auth-plugin";

export const steamAuthClientPlugin = () => {
  return {
    id: "steam-auth-client",
    $InferServerPlugin: {} as ReturnType<typeof steamAuthPlugin>,
  } satisfies BetterAuthClientPlugin;
};

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_API_URL,
  plugins: [inferAdditionalFields<typeof auth>(), steamAuthClientPlugin()],
});

export const signInWithSteam = async (options?: {
  callbackURL?: string;
  errorCallbackURL?: string;
  newUserCallbackURL?: string;
  disableRedirect?: boolean;
}) => {
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/sign-in/steam`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options || {}),
  });

  const data = await response.json();

  if (data.redirect !== false) {
    window.location.href = data.url;
  }

  return data;
};
