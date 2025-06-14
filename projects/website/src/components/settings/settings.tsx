"use client";

import ScoreSettings from "@/components/settings/category/score";
import WebsiteSettings from "@/components/settings/category/website";
import { Button } from "@/components/ui/button";
import { CubeIcon, GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { ReactNode, useRef, useState } from "react";
import { FaCog } from "react-icons/fa";
import SimpleTooltip from "../simple-tooltip";
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
        <SimpleTooltip display="Settings">
          <FaCog className="size-5 text-zinc-200 hover:animate-spin-slow transition-colors hover:text-primary cursor-pointer" />
        </SimpleTooltip>
      </DialogTrigger>
      <DialogContent className="max-w-[800px] w-[95vw] h-[600px] max-h-[90vh] flex flex-col">
        <DialogTitle className="text-xl font-semibold mb-4">Settings</DialogTitle>

        <div className="flex flex-col md:flex-row gap-6 h-full">
          {/* Sidebar */}
          <div className="flex md:flex-col md:w-32 gap-2 md:gap-1 overflow-x-auto md:overflow-x-visible">
            {categories.map(category => (
              <Button
                key={category.name}
                variant={selectedCategory.name === category.name ? "default" : "ghost"}
                className="whitespace-nowrap md:w-full justify-start"
                onClick={() => setSelectedCategory(category)}
              >
                {category.icon()}
                <span className="ml-2">{category.name}</span>
              </Button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {selectedCategory.component(save, websiteFormRef!, scoreFormRef!)}
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-4 pt-4 border-t">
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            <ResetDatabase />
            <ExportSettings />
            <ImportSettings />
          </div>
          <Button onClick={save} className="w-full md:w-auto">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
