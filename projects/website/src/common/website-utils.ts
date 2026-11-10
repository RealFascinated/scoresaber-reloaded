import { env } from "@ssr/common/env";

export function isProduction() {
  return env.NEXT_PUBLIC_APP_ENV === "production";
}
