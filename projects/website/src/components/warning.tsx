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
    <div className="flex items-center justify-center gap-2">
      <ExclamationTriangleIcon
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
        }}
      />
      {children}
    </div>
  );
}
