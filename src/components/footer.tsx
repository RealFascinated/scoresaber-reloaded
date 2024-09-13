import NavbarButton from "@/components/navbar/navbar-button";
import Link from "next/link";
import { getBuildInformation } from "@/common/website-utils";

type NavbarItem = {
  name: string;
  link: string;
};

const items: NavbarItem[] = [
  {
    name: "Home",
    link: "/",
  },
  {
    name: "Source",
    link: "https://git.fascinated.cc/Fascinated/scoresaber-reloadedv3",
  },
];

export default function Footer() {
  const { buildId, buildTime } = getBuildInformation();

  return (
    <div className="flex items-center w-full flex-col gap-1">
      <p className="text-input text-sm">
        Build: {buildId} ({buildTime})
      </p>
      <div className="h-14 w-full flex items-center justify-center bg-secondary/95 divide-x divide-input">
        {items.map((item, index) => {
          return (
            <Link className="px-2 text-pp hover:brightness-75" href={item.link}>
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
