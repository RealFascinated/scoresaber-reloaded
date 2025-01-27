import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { ReactNode } from "react";

export default function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 text-sm text-red-500 items-center text-center">
      <ExclamationTriangleIcon className="w-5 h-5" />
      {children}
    </div>
  );
}
