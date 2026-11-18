export default function PlayerActionButtonWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="cursor-pointer rounded-md bg-muted p-2 transition-all hover:bg-accent">{children}</div>
  );
}
