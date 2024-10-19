import { getBuildInformation } from "@/common/website-utils";
import Link from "next/link";

type NavbarItem = {
  name: string;
  link: string;
  openInNewTab?: boolean;
};

const items: NavbarItem[] = [
  {
    name: "Home",
    link: "/",
  },
  {
    name: "Source",
    link: "https://git.fascinated.cc/Fascinated/scoresaber-reloadedv3",
    openInNewTab: true,
  },
  {
    name: "Twitter",
    link: "https://x.com/ssr_reloaded",
    openInNewTab: true,
  },
  {
    name: "Discord",
    link: "https://discord.gg/kmNfWGA4A8",
    openInNewTab: true,
  },
  {
    name: "Status",
    link: "https://status.fascinated.cc/status/scoresaber-reloaded",
    openInNewTab: true,
  },
  {
    name: "Swagger",
    link: "/swagger",
    openInNewTab: true,
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
      <div className="w-full flex flex-wrap items-center justify-center bg-secondary/95 divide-x divide-input text-sm py-2">
        {items.map((item, index) => {
          return (
            <Link
              key={index}
              className="px-2 text-pp hover:brightness-75 transition-all transform-gpu"
              href={item.link}
              target={item.openInNewTab ? "_blank" : undefined}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
