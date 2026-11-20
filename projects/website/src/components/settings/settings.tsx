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
  icon: SharedDecorativeIcon;
  component: ReactNode;
};

const categories: Category[] = [
  {
    slug: "website",
    name: "Website",
    icon: SharedIcons.WebsiteSettingsCategoryIcon,
    component: <WebsiteSettings />,
  },
  {
    slug: "scores",
    name: "Scores",
    icon: SharedIcons.ScoreSettingsCategoryIcon,
    component: <ScoreSettings />,
  },
  {
    slug: "player",
    name: "Player",
    icon: SharedIcons.PlayerSettingsCategoryIcon,
    component: <PlayerSettings />,
  },
];

function categoryFromParam(param: string | null) {
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
      <PageTitle title="Settings" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[16rem_1fr] lg:gap-6">
        <nav
          className="h-fit rounded-xl bg-card p-3 ring-1 ring-border lg:sticky lg:top-16"
          aria-label="Settings categories"
        >
          <div className="flex flex-col gap-1">
            {categories.map(category => {
              const isActive = selectedCategory.slug === category.slug;
              return (
                <button
                  key={category.slug}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-hover"
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

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="rounded-xl bg-card p-4 ring-1 ring-border">
            <h2 className="mb-4 text-lg font-semibold">{selectedCategory.name}</h2>
            {selectedCategory.component}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-card p-4 ring-1 ring-border">
            <div>
              <p className="text-sm font-semibold">Reset Settings</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
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
