import SessionHydration from "@/components/providers/session-hydration";
import ThemeProvider from "@/components/providers/theme-provider";
import { SiteTheme, ssrConfig } from "config";
import { ReactNode } from "react";

/**
 * The overlay editor takes the whole window, so it has none of the site's sidebar or header.
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
        <main className="bg-background text-foreground min-h-screen w-full">{children}</main>
      </SessionHydration>
    </ThemeProvider>
  );
}
