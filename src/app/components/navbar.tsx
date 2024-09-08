import Link from "next/link";
import React from "react";

type NavbarItem = {
  name: string;
  link: string;
  icon: React.ReactNode;
};

const items: NavbarItem[] = [
  {
    name: "Home",
    link: "/",
    icon: undefined, // Add your home icon here
  },
  {
    name: "Search",
    link: "/search",
    icon: undefined, // Add your search icon here
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
  return (
    <div className="p-2">
      <div className="px-2 h-10 rounded-md items-center flex justify-between bg-secondary">
        {/* Left-aligned items */}
        <div className="flex items-center gap-2">
          {items.slice(0, -1).map((item, index) => (
            <div key={index}>
              <Link href={item.link}>{renderNavbarItem(item)}</Link>
            </div>
          ))}
        </div>

        {/* Right-aligned item */}
        <div>
          <Link href={items[items.length - 1].link}>{renderNavbarItem(items[items.length - 1])}</Link>
        </div>
      </div>
    </div>
  );
}
