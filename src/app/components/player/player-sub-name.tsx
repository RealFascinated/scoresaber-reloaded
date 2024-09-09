type Props = {
  icon?: React.ReactNode;
  children: React.ReactNode;
};

export default function PlayerSubName({ icon, children }: Props) {
  return (
    <div className="flex gap-1 items-center">
      {icon}
      {children}
    </div>
  );
}
