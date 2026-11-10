export default function PlayerActionButtonWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted hover:bg-accent cursor-pointer rounded-md p-2 transition-all">{children}</div>
  );
}
