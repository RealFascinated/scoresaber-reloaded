import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { ReactNode } from "react";

type WarningProps = {
  /**
   * The size of the warning icon.
   */
  size?: number;

  /**
   * The children to display.
   */
  children: ReactNode;
};

export function Warning({ size = 32, children }: WarningProps) {
  return (
    <div className="flex gap-2 items-center justify-center">
      <ExclamationTriangleIcon
        width={size}
        height={size}
        className={`w-[${size}px] h-[${size}px]`}
      />
      {children}
    </div>
  );
}
