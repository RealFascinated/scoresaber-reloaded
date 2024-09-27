import { HomeIcon } from "@heroicons/react/24/solid";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import React from "react";
import NavbarButton from "./navbar-button";
import ProfileButton from "./profile-button";

type NavbarItem = {
  name: string;
  link: string;
  icon: React.ReactNode;
};

const items: NavbarItem[] = [
  {
    name: "Home",
    link: "/",
    icon: <HomeIcon className="h-5 w-5" />, // Add your home icon here
  },
  {
    name: "Search",
    link: "/search",
    icon: <MagnifyingGlassIcon className="h-5 w-5" />, // Add your search icon here
  },
];

// Helper function to render each navbar item
const renderNavbarItem = (item: NavbarItem) => (
  <div className="flex items-center">
    {item.icon && <div className="mr-2">{item.icon}</div>}
    <div>{item.name}</div>
  </div>
);

export default function Navbar() {
  const rightItem = items[items.length - 1];

  return (
    <div className="w-full sticky top-0 z-[999]">
      <div className="h-10 items-center flex justify-between bg-secondary/95">
        {/* Left-aligned items */}
        <div className="flex items-center h-full">
          <ProfileButton />

          {items.slice(0, -1).map((item, index) => (
            <Link href={item.link} key={index} className="h-full">
              <NavbarButton key={index}>{renderNavbarItem(item)}</NavbarButton>
            </Link>
          ))}
        </div>

        {/* Right-aligned item */}
        <Link href={rightItem.link} className="h-full">
          <NavbarButton>{renderNavbarItem(rightItem)}</NavbarButton>
        </Link>
      </div>
    </div>
  );
}
