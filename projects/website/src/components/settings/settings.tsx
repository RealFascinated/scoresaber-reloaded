"use client";

import ScoreSettings from "@/components/settings/category/score";
import WebsiteSettings from "@/components/settings/category/website";
import { Button } from "@/components/ui/button";
import { CogIcon, CubeIcon, GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { ReactNode, useRef, useState } from "react";
import Tooltip from "../tooltip";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "../ui/dialog";
import ExportSettings from "./export-settings";
import ImportSettings from "./import-settings";
import ResetDatabase from "./reset-database";

type Category = {
  name: string;
  icon: () => ReactNode;
  component: (
    onSave: () => void,
    websiteFormRef: React.RefObject<{ submit: () => void }>,
    scoreFormRef: React.RefObject<{ submit: () => void }>
  ) => ReactNode;
};

const categories: Category[] = [
  {
    name: "Website",
    icon: () => <GlobeAmericasIcon className="size-5" />,
    component: (
      onSave: () => void,
      websiteFormRef: React.RefObject<{ submit: () => void }>,
      scoreFormRef: React.RefObject<{ submit: () => void }>
    ) => <WebsiteSettings onSave={onSave} ref={websiteFormRef} />,
  },
  {
    name: "Scores",
    icon: () => <CubeIcon className="size-5" />,
    component: (
      onSave: () => void,
      websiteFormRef: React.RefObject<{ submit: () => void }>,
      scoreFormRef: React.RefObject<{ submit: () => void }>
    ) => <ScoreSettings onSave={onSave} ref={scoreFormRef} />,
  },
];

export default function Settings() {
  const [selectedCategory, setSelectedCategory] = useState<Category>(categories[0]);

  // Create refs for the forms
  const websiteFormRef = useRef<{ submit: () => void }>({ submit: () => {} });
  const scoreFormRef = useRef<{ submit: () => void }>({ submit: () => {} });

  function save() {
    websiteFormRef.current?.submit();
    scoreFormRef.current?.submit();
  }

  return (
    <Dialog>
      <DialogTrigger>
        <CogIcon className="size-6 text-zinc-200 hover:animate-spin-slow" />
      </DialogTrigger>
      <DialogContent className="max-w-[800px] max-h-[400px] h-full w-full flex flex-col">
        {/* Header */}
        <DialogTitle>Settings</DialogTitle>

        {/* Categories */}
        <div className="flex flex-col md:flex-row text-sm divide-y divide-muted md:divide-x md:divide-y-0 h-full w-full">
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
          <div className="pt-2 md:pl-3 md:pt-0 h-full flex flex-col gap-2 w-full">
            {selectedCategory.component(save, websiteFormRef!, scoreFormRef!)}
            <div className="flex justify-between gap-2">
              <div className="flex gap-2">
                <ResetDatabase />
                <ExportSettings />
                <ImportSettings />
              </div>

              <Tooltip display="Save your settings">
                <Button className="w-fit" onClick={save}>
                  Save
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
