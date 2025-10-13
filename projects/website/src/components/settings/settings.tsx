"use client";

import { cn } from "@/common/utils";
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
];

export default function Settings() {
  const [selectedCategory, setSelectedCategory] = useState<Category>(categories[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Handle body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";

    // Handle escape key
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "unset";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300);
  };

  const settingsContent = (isOpen || isClosing) ? (
    <div
      className={cn(
        "bg-background fixed inset-0 z-50 h-screen w-screen overflow-hidden",
        "animate-in fade-in-0 duration-300",
        isClosing && "animate-out fade-out-0 duration-300"
      )}
    >
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/50",
          "animate-in fade-in-0 duration-300",
          isClosing && "animate-out fade-out-0 duration-300"
        )}
        onClick={handleClose}
      />
      
      {/* Modal Content */}
      <div className={cn(
        "relative flex h-full flex-col",
        "animate-in slide-in-from-bottom-4 duration-300",
        isClosing && "animate-out slide-out-to-bottom-4 duration-300"
      )}>
        {/* Header */}
        <div className="border-border/50 flex items-center justify-between border-b px-4 py-4 md:px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-foreground text-xl font-semibold">Settings</h1>
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
            onClick={handleClose}
          >
            <XMarkIcon className="size-5" />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Sidebar - Hidden on mobile */}
          <div className="border-border/50 hidden w-72 border-r md:block">
            <div className="flex h-full flex-col">
              <div className="p-6 pb-2">
                <h2 className="text-muted-foreground text-sm font-medium tracking-wide">
                  Settings
                </h2>
              </div>
              <div className="flex-1 px-3 py-2">
                {categories.map(category => (
                  <div
                    key={category.name}
                    className={cn(
                      "mb-2 rounded-lg transition-all duration-200",
                      selectedCategory.name === category.name
                        ? "bg-primary/10 border-primary"
                        : "bg-muted/50 border-border hover:bg-secondary/50"
                    )}
                  >
                    <Button
                      variant="ghost"
                      className={cn(
                        "h-14 w-full justify-start transition-all duration-200",
                        selectedCategory.name === category.name
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setSelectedCategory(category)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "rounded-lg p-2",
                            selectedCategory.name === category.name
                              ? "bg-primary/10"
                              : "bg-muted/50"
                          )}
                        >
                          <category.icon className="size-5" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{category.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {category.description}
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
            <div className="mx-auto max-w-3xl p-4 md:p-6">{selectedCategory.component}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-border/50 flex flex-col items-center justify-between gap-4 border-t px-4 py-4 md:flex-row md:px-6">
          <div className="flex w-full items-center justify-center gap-3 md:w-auto md:justify-start">
            <ResetDatabase />
            <div className="bg-border/50 h-5 w-px" />
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
          className="text-muted-foreground hover:animate-spin-slow hover:text-primary size-5 cursor-pointer transition-colors"
          onClick={() => setIsOpen(true)}
        />
      </SimpleTooltip>
      {(isOpen || isClosing) && createPortal(settingsContent, document.body)}
    </>
  );
}
