"use client";

import ScoreSettings from "@/components/settings/category/score-settings";
import WebsiteSettings from "@/components/settings/category/website-settings";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CubeIcon, GlobeAmericasIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconType } from "react-icons";
import { FaCog } from "react-icons/fa";
import SimpleTooltip from "../simple-tooltip";
import ExportSettings from "./buttons/export-settings";
import ImportSettings from "./buttons/import-settings";
import ResetDatabase from "./buttons/reset-database";

type Category = {
  name: string;
  icon: IconType;
  component: ReactNode;
};

const categories: Category[] = [
  {
    name: "Website",
    icon: GlobeAmericasIcon,
    component: <WebsiteSettings />,
  },
  {
    name: "Scores",
    icon: CubeIcon,
    component: <ScoreSettings />,
  },
];

export default function Settings() {
  const [selectedCategory, setSelectedCategory] = useState<Category>(categories[0]);
  const [isOpen, setIsOpen] = useState(false);

  // Handle body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const settingsContent = isOpen ? (
    <div className="fixed inset-0 w-screen h-screen bg-background overflow-hidden z-50">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-foreground">Settings</h1>
            {/* Mobile Category Selector */}
            <div className="md:hidden">
              <Select
                value={selectedCategory.name}
                onValueChange={value => {
                  const category = categories.find(c => c.name === value);
                  if (category) setSelectedCategory(category);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <selectedCategory.icon className="size-5" />
                      <span>{selectedCategory.name}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.name} value={category.name}>
                      <div className="flex items-center gap-2">
                        <category.icon className="size-5" />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setIsOpen(false)}
          >
            <XMarkIcon className="size-5" />
          </Button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar - Hidden on mobile */}
          <div className="hidden md:block w-72 border-r border-border/50">
            <div className="h-full flex flex-col">
              <div className="p-6 pb-2">
                <h2 className="text-sm font-medium text-muted-foreground tracking-wide">
                  Settings
                </h2>
              </div>
              <div className="flex-1 px-3 py-2">
                {categories.map(category => (
                  <div
                    key={category.name}
                    className={`mb-2 rounded-lg transition-all duration-200 ${
                      selectedCategory.name === category.name
                        ? "bg-primary/10"
                        : "hover:bg-secondary/50"
                    }`}
                  >
                    <Button
                      variant="ghost"
                      className={`w-full h-14 justify-start transition-all duration-200 ${
                        selectedCategory.name === category.name
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setSelectedCategory(category)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            selectedCategory.name === category.name
                              ? "bg-primary/20"
                              : "bg-secondary/50"
                          }`}
                        >
                          <category.icon className="size-5" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{category.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {category.name === "Website"
                              ? "Customize your experience"
                              : "Manage your scores"}
                          </span>
                        </div>
                      </div>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto p-4 md:p-6">{selectedCategory.component}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4 md:px-6 py-4 border-t border-border/50">
          <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
            <ResetDatabase />
            <div className="h-5 w-px bg-border/50" />
            <ExportSettings />
            <ImportSettings />
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <SimpleTooltip display="Settings">
        <FaCog
          className="size-5 text-muted-foreground hover:animate-spin-slow transition-colors hover:text-primary cursor-pointer"
          onClick={() => setIsOpen(true)}
        />
      </SimpleTooltip>
      {isOpen && createPortal(settingsContent, document.body)}
    </>
  );
}
