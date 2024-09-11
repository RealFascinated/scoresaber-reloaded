type Props = {
  icon?: React.ReactNode;
  children: React.ReactNode;
};

export default function PlayerDataPoint({ icon, children }: Props) {
  return (
    <div className="flex gap-1 items-center">
      {icon}
      {children}
    </div>
  );
}
