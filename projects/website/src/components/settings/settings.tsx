"use client";

import { cn } from "@/common/utils";
import ScoreSettings from "@/components/settings/category/score-settings";
import WebsiteSettings from "@/components/settings/category/website-settings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Box, Globe, type LucideIcon, User } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useCallback, useMemo } from "react";
import ResetSettings from "./buttons/reset-settings";
import PlayerSettings from "./category/player-settings";

type SettingsCategorySlug = "website" | "scores" | "player";

type Category = {
  slug: SettingsCategorySlug;
  name: string;
  description: string;
  icon: LucideIcon;
  component: ReactNode;
};

const categories: Category[] = [
  {
    slug: "website",
    name: "Website",
    description: "Customize your experience",
    icon: Globe,
    component: <WebsiteSettings />,
  },
  {
    slug: "scores",
    name: "Scores",
    description: "Manage your scores",
    icon: Box,
    component: <ScoreSettings />,
  },
  {
    slug: "player",
    name: "Player",
    description: "Manage your player",
    icon: User,
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
    <div className="bg-card/80 border-border flex w-full flex-col overflow-hidden rounded-xl border shadow-sm">
      <div className="border-border bg-muted/15 border-b p-(--spacing-md) md:hidden">
        <Select
          value={selectedCategory.slug}
          onValueChange={value => {
            const category = categories.find(c => c.slug === value);
            if (category) setCategory(category);
          }}
        >
          <SelectTrigger className="w-full" aria-label="Settings category">
            <SelectValue>
              <div className="flex items-center gap-(--spacing-sm)">
                <selectedCategory.icon className="size-5" aria-hidden />
                <span>{selectedCategory.name}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category.slug} value={category.slug}>
                <div className="flex flex-col items-start gap-0.5 py-0.5">
                  <div className="flex items-center gap-(--spacing-sm)">
                    <category.icon className="size-5 shrink-0" aria-hidden />
                    <span>{category.name}</span>
                  </div>
                  <span className="text-muted-foreground pl-7 text-xs">{category.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex">
        <nav
          className="border-border bg-muted/25 hidden w-[220px] shrink-0 flex-col border-r md:flex lg:w-[240px]"
          aria-label="Settings categories"
        >
          <div className="border-border/60 border-b px-3 py-3">
            <p className="text-muted-foreground px-2 text-xs font-semibold tracking-wide uppercase">
              Settings
            </p>
          </div>
          <div className="flex flex-col gap-0.5 p-2">
            {categories.map(category => {
              const isActive = selectedCategory.slug === category.slug;
              return (
                <button
                  key={category.slug}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex w-full cursor-pointer items-start gap-2.5 rounded-md py-2 pr-2 pl-3 text-left text-sm transition-colors",
                    isActive
                      ? "bg-muted/90 text-foreground before:bg-primary before:absolute before:top-1 before:bottom-1 before:left-0 before:w-[3px] before:rounded-full"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                  onClick={() => setCategory(category)}
                >
                  <category.icon className="mt-0.5 size-4 shrink-0 opacity-80" aria-hidden />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="leading-snug font-medium">{category.name}</span>
                    <span
                      className={cn(
                        "text-[11px] leading-snug wrap-break-word opacity-90",
                        isActive ? "text-muted-foreground" : "text-muted-foreground/80"
                      )}
                    >
                      {category.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="bg-background/50 flex min-w-0 flex-1 flex-col">
          <header className="border-border hidden shrink-0 border-b px-6 py-5 md:block md:px-8 lg:px-10">
            <h1 className="text-foreground text-2xl font-bold tracking-tight">{selectedCategory.name}</h1>
            <p className="text-muted-foreground mt-1 max-w-xl text-sm">{selectedCategory.description}</p>
          </header>

          <div className="overflow-x-hidden">
            <div className="mx-auto w-full max-w-2xl px-4 py-5 md:px-8 md:py-6 lg:px-10">
              <div className="md:hidden">
                <h1 className="text-foreground mb-4 text-xl font-bold tracking-tight">
                  {selectedCategory.name}
                </h1>
              </div>
              {selectedCategory.component}
            </div>
          </div>
        </div>
      </div>

      <div className="border-border bg-muted/10 flex flex-wrap items-center gap-(--spacing-sm) border-t px-(--spacing-lg) py-(--spacing-md) md:px-8 md:py-(--spacing-lg)">
        <ResetSettings />
      </div>
    </div>
  );
}
