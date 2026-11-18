import { env } from "@ssr/common/env";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${env.NEXT_PUBLIC_WEBSITE_URL}/sitemap.xml`,
  };
}
