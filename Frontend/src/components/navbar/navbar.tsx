import { CogIcon, HomeIcon } from "@heroicons/react/24/solid";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import React from "react";
import NavbarButton from "./navbar-button";
import ProfileButton from "./profile-button";

type NavbarItem = {
  name: string;
  link: string;
  align: "left" | "right";
  icon: React.ReactNode;
};

const items: NavbarItem[] = [
  {
    name: "Home",
    link: "/",
    align: "left",
    icon: <HomeIcon className="h-5 w-5" />,
  },
  {
    name: "Search",
    link: "/search",
    align: "right",
    icon: <MagnifyingGlassIcon className="h-5 w-5" />,
  },
  {
    name: "Settings",
    link: "/settings",
    align: "right",
    icon: <CogIcon className="h-5 w-5" />,
  },
];

// Helper function to render each navbar item
const renderNavbarItem = (item: NavbarItem) => (
  <div className="flex items-center w-fit gap-2">
    {item.icon && <div>{item.icon}</div>}
    <p className="hidden lg:block">{item.name}</p>
  </div>
);

export default function Navbar() {
  const rightItems = items.filter(item => item.align === "right");
  const leftItems = items.filter(item => item.align === "left");

  return (
    <div className="w-full sticky top-0 z-[999]">
      <div className="h-10 items-center flex justify-between bg-secondary/95 px-1">
        {/* Left-aligned items */}
        <div className="flex items-center h-full">
          <ProfileButton />

          {leftItems.map((item, index) => (
            <Link href={item.link} key={index} className="h-full">
              <NavbarButton key={index}>{renderNavbarItem(item)}</NavbarButton>
            </Link>
          ))}
        </div>

        {/* Right-aligned items */}
        <div className="flex items-center h-full">
          {rightItems.map((item, index) => (
            <Link href={item.link} key={index} className="h-full">
              <NavbarButton key={index}>{renderNavbarItem(item)}</NavbarButton>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
