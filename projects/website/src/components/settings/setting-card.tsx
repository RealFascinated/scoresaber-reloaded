import { ReactNode } from "react";

interface SettingCardProps {
  children: ReactNode;
}

export function SettingCard({ children }: SettingCardProps) {
  return <div className="rounded-lg border border-border/50 bg-card p-4">{children}</div>;
}
