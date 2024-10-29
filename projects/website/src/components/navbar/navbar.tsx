import { CogIcon } from "@heroicons/react/24/solid";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import React from "react";
import NavbarButton from "./navbar-button";
import ProfileButton from "./profile-button";
import { TrendingUpIcon } from "lucide-react";
import FriendsButton from "@/components/navbar/friends-button";

type NavbarItem = {
  name: string;
  link: string;
  align: "left" | "right";
  icon: React.ReactNode;
};

const items: NavbarItem[] = [
  {
    name: "Ranking",
    link: "/ranking",
    align: "left",
    icon: <TrendingUpIcon className="h-5 w-5" />,
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
    <div className="w-full sticky top-0 z-[999] h-10 items-center flex justify-between bg-secondary/95 px-1">
      <div className="md:max-w-[1600px] w-full h-full flex justify-between m-auto">
        <div className="flex items-center h-full">
          {/* Home Button */}
          <Link href="/" className="h-full">
            <NavbarButton>
              {renderNavbarItem({
                name: "Home",
                link: "/",
                align: "left",
                icon: <img src="/assets/logos/scoresaber.png" className="h-5 w-5" alt="Website Logo" />,
              })}
            </NavbarButton>
          </Link>

          {/* Player Buttons */}
          <ProfileButton />
          <FriendsButton />

          {/* Left-aligned items */}
          {leftItems.splice(0, leftItems.length).map((item, index) => (
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
