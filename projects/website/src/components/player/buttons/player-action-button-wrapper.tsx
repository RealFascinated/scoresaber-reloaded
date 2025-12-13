export default function PlayerActionButtonWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-accent hover:bg-accent-deep/50 cursor-pointer rounded-md p-2 transition-all">{children}</div>
  );
}
