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
  const { buildId, buildTime, buildTimeShort } = getBuildInformation();

  return (
    <div className="flex items-center w-full flex-col gap-1 mt-6">
      <div className="flex items-center gap-2 text-input text-sm">
        <p>Build: {buildId}</p>
        <p className="hidden md:block">({buildTime})</p>
        <p className="none md:hidden">({buildTimeShort})</p>
      </div>
      <div className="h-12 w-full flex flex-wrap items-center justify-center bg-secondary/95 divide-x divide-input">
        {items.map((item, index) => {
          return (
            <Link
              key={index}
              className="px-2 text-pp hover:brightness-75 transition-all transform-gpu"
              href={item.link}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
