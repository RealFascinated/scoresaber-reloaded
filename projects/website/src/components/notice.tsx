import { SharedIcons } from "@/shared-icons";
import { ReactNode } from "react";

export default function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-center text-sm text-red-500">
      <SharedIcons.SiteNoticeWarningIcon className="h-5 w-5" />
      {children}
    </div>
  );
}
