import { SharedIcons } from "@/shared-icons";
import { ReactNode } from "react";

export default function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
      <SharedIcons.SiteNoticeWarningIcon className="mt-0.5 size-4 shrink-0 text-amber-400" />
      {children}
    </div>
  );
}
