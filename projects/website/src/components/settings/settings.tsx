"use client";

import { cn } from "@/common/utils";
import { PageTitle } from "@/components/page-title";
import ScoreSettings from "@/components/settings/category/score-settings";
import WebsiteSettings from "@/components/settings/category/website-settings";
import { SharedIcons, type SharedDecorativeIcon } from "@/shared-icons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useCallback, useMemo } from "react";
import ResetSettings from "./buttons/reset-settings";
import PlayerSettings from "./category/player-settings";

type SettingsCategorySlug = "website" | "scores" | "player";

type Category = {
  slug: SettingsCategorySlug;
  name: string;
  description: string;
  icon: SharedDecorativeIcon;
  component: ReactNode;
};

const categories: Category[] = [
  {
    slug: "website",
    name: "Website",
    description: "Customize your experience",
    icon: SharedIcons.WebsiteSettingsCategoryIcon,
    component: <WebsiteSettings />,
  },
  {
    slug: "scores",
    name: "Scores",
    description: "Manage your scores",
    icon: SharedIcons.ScoreSettingsCategoryIcon,
    component: <ScoreSettings />,
  },
  {
    slug: "player",
    name: "Player",
    description: "Manage your player",
    icon: SharedIcons.PlayerSettingsCategoryIcon,
    component: <PlayerSettings />,
  },
];

function categoryFromParam(param: string | null): Category {
  if (param === "website" || param === "scores" || param === "player") {
    return categories.find(c => c.slug === param) ?? categories[0];
  }
  return categories[0];
}

export default function Settings() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const categoryParam = searchParams.get("category");
  const selectedCategory = useMemo(() => categoryFromParam(categoryParam), [categoryParam]);

  const setCategory = useCallback(
    (category: Category) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("category", category.slug);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <PageTitle title="Settings" description="Manage your account and preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-4 lg:gap-6">
        {/* Category navigation */}
        <nav className="rounded-xl ring-1 ring-border bg-card p-3 h-fit lg:sticky lg:top-4" aria-label="Settings categories">
          <div className="flex flex-col gap-1">
            {categories.map(category => {
              const isActive = selectedCategory.slug === category.slug;
              return (
                <button
                  key={category.slug}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors w-full cursor-pointer text-left",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                  onClick={() => setCategory(category)}
                >
                  <category.icon className="size-4 shrink-0" aria-hidden />
                  <span>{category.name}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content area */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="rounded-xl ring-1 ring-border bg-card p-5">
            <h2 className="text-lg font-semibold mb-4">{selectedCategory.name}</h2>
            {selectedCategory.component}
          </div>

          <div className="flex items-center justify-between rounded-xl ring-1 ring-border bg-card p-4">
            <div>
              <p className="text-sm font-medium">Reset Settings</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Restore all settings to their default values
              </p>
            </div>
            <ResetSettings />
          </div>
        </div>
      </div>
    </div>
  );
}
