"use client";

import { cn } from "@/common/utils";
import ScoreSettings from "@/components/settings/category/score-settings";
import WebsiteSettings from "@/components/settings/category/website-settings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CubeIcon, GlobeAmericasIcon, UserIcon } from "@heroicons/react/24/solid";
import { ReactNode, useState } from "react";
import { IconType } from "react-icons";
import Card from "../card";
import ExportSettings from "./buttons/export-settings";
import ImportSettings from "./buttons/import-settings";
import ResetSettings from "./buttons/reset-settings";
import PlayerSettings from "./category/player-settings";

type Category = {
  name: string;
  description: string;
  icon: IconType;
  component: ReactNode;
};

const categories: Category[] = [
  {
    name: "Website",
    description: "Customize your experience",
    icon: GlobeAmericasIcon,
    component: <WebsiteSettings />,
  },
  {
    name: "Scores",
    description: "Manage your scores",
    icon: CubeIcon,
    component: <ScoreSettings />,
  },
  {
    name: "Player",
    description: "Manage your player",
    icon: UserIcon,
    component: <PlayerSettings />,
  },
];

export default function Settings() {
  const [selectedCategory, setSelectedCategory] = useState<Category>(categories[0]);
  return (
    <Card className="relative flex h-full flex-col">
      {/* Header */}
      <div className="border-border border-b px-(--spacing-2xl) py-(--spacing-2xl)">
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      {/* Mobile Category Selector */}
      <div className="border-border border-b p-(--spacing-xl) md:hidden">
        <Select
          value={selectedCategory.name}
          onValueChange={value => {
            const category = categories.find(c => c.name === value);
            if (category) setSelectedCategory(category);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              <div className="flex items-center gap-(--spacing-sm)">
                <selectedCategory.icon className="size-5" />
                <span>{selectedCategory.name}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category.name} value={category.name}>
                <div className="flex items-center gap-(--spacing-sm)">
                  <category.icon className="size-5" />
                  <span>{category.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="border-border hidden w-44 border-r md:block">
          <div className="flex h-full flex-col gap-(--spacing-xs) p-(--spacing-lg)">
            {categories.map(category => (
              <button
                key={category.name}
                className={cn(
                  "flex cursor-pointer items-center gap-(--spacing-md) rounded-(--radius-md) px-(--spacing-lg) py-(--spacing-sm) text-sm transition-colors duration-200",
                  selectedCategory.name === category.name
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                onClick={() => setSelectedCategory(category)}
              >
                <category.icon className="size-4 shrink-0" />
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="p-(--spacing-2xl)">{selectedCategory.component}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-border flex items-center justify-end gap-(--spacing-lg) border-t px-(--spacing-2xl) py-(--spacing-xl)">
        <ResetSettings />
        <div className="bg-border/50 h-5 w-px" />
        <ExportSettings />
        <ImportSettings />
      </div>
    </Card>
  );
}
