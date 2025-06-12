export default function PlayerActionButtonWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-2 bg-accent rounded-md cursor-pointer hover:brightness-75 transition-all">
      {children}
    </div>
  );
}
