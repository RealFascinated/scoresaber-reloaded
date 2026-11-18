import { SharedIcons } from "@/shared-icons";
import { ReactNode } from "react";

export default function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2 text-sm text-warning">
      <SharedIcons.SiteNoticeWarningIcon className="mt-0.5 size-4 shrink-0 text-warning" />
      {children}
    </div>
  );
}
