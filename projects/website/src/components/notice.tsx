import { SharedIcons } from "@/shared-icons";
import { ReactNode } from "react";

export default function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="border-warning/25 bg-warning/10 text-warning flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
      <SharedIcons.SiteNoticeWarningIcon className="text-warning mt-0.5 size-4 shrink-0" />
      {children}
    </div>
  );
}
