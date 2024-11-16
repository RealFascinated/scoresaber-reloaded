"use client";

import WebsiteSettings from "@/components/settings/category/website";
import ScoreSettings from "@/components/settings/category/score";
import { ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CubeIcon, GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { useSearchParams } from "next/navigation";
import usePageNavigation from "@/hooks/use-page-navigation";

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
  const params = useSearchParams();
  const navigation = usePageNavigation();

  const [selectedCategory, setSelectedCategory] = useState<Category>(
    getCategoryFromName(params.get("category")) || categories[0]
  );

  useEffect(() => {
    navigation.navigateToPage(`/settings/?category=${getCategoryName(selectedCategory.name)}`);
  }, [navigation, selectedCategory.name]);

  return (
    <div className="flex flex-col md:flex-row gap-3 text-sm divide-y divide-muted md:divide-x md:divide-y-0">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Settings</p>
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

      <div className="pt-2 md:pl-3 md:pt-0">{selectedCategory.component()}</div>
    </div>
  );
}
