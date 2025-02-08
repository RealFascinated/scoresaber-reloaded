"use client";

import ScoreSettings from "@/components/settings/category/score";
import WebsiteSettings from "@/components/settings/category/website";
import { Button } from "@/components/ui/button";
import { CogIcon, CubeIcon, GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { ReactNode, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "../ui/dialog";

type Category = {
  name: string;
  icon: () => ReactNode;
  component: () => ReactNode;
};

const categories: Category[] = [
  {
    name: "Website",
    icon: () => <GlobeAmericasIcon className="size-5" />,
    component: () => <WebsiteSettings />,
  },
  {
    name: "Scores",
    icon: () => <CubeIcon className="size-5" />,
    component: () => <ScoreSettings />,
  },
];

/**
 * Gets the category from the name.
 *
 * @param name the name of the category
 * @returns the category
 */
function getCategoryFromName(name: string | null) {
  if (!name) {
    return undefined;
  }
  return categories.find(category => getCategoryName(category) == getCategoryName(name));
}

/**
 * Gets the category name.
 *
 * @param category the category
 * @returns the category name
 */
function getCategoryName(category: Category | string | null) {
  if (!category) {
    return undefined;
  }
  return (typeof category == "string" ? category : category.name).replace(" ", "").toLowerCase();
}

export default function Settings() {
  const [selectedCategory, setSelectedCategory] = useState<Category>(categories[0]);

  return (
    <Dialog>
      <DialogTrigger>
        <CogIcon className="size-6 text-zinc-200 hover:animate-spin-slow" />
      </DialogTrigger>
      <DialogContent className="max-w-[800px] max-h-[400px] h-full flex flex-col">
        {/* Header */}
        <DialogTitle>Settings</DialogTitle>

        {/* Categories */}
        <div className="flex flex-col md:flex-row text-sm divide-y divide-muted md:divide-x md:divide-y-0 h-full">
          <div className="flex flex-col gap-2 pb-3 md:pb-0 md:pr-3">
            <div className="flex flex-row md:flex-col gap-1.5 w-full md:w-36">
              {categories.map(category => (
                <Button
                  key={category.name}
                  variant={selectedCategory.name == category.name ? "default" : "outline"}
                  className="justify-start flex gap-2 px-2 border-none"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category.icon()}
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Selected Category */}
          <div className="pt-2 md:pl-3 md:pt-0 h-full">{selectedCategory.component()}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
