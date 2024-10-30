import { HTMLAttributes, ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function NavbarButton({ children, ...props }: Props & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className="px-2 gap-2 rounded-md text-sm hover:opacity-80 transform-gpu transition-all h-full flex items-center"
      {...props}
    >
      {children}
    </div>
  );
}
