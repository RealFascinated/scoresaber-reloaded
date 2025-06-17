export default function PlayerActionButtonWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-accent cursor-pointer rounded-md p-2 transition-all hover:brightness-75">
      {children}
    </div>
  );
}
