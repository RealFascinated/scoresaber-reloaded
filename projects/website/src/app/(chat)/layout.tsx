import SessionHydration from "@/components/providers/session-hydration";
import ThemeProvider from "@/components/providers/theme-provider";
import { SiteTheme, ssrConfig } from "config";
import { ReactNode } from "react";

/**
 * The chat is a standalone app, so it has none of the site's sidebar, header or background.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={ssrConfig.themes[0].id}
      enableSystem={false}
      themes={ssrConfig.themes.map((theme: SiteTheme) => theme.id)}
    >
      <SessionHydration>
        <div className="h-dvh w-full bg-background text-foreground antialiased">{children}</div>
      </SessionHydration>
    </ThemeProvider>
  );
}
