type Props = {
  children: React.ReactNode;
};

export default function NavbarButton({ children }: Props) {
  return (
    <div className="px-2 gap-2 rounded-md hover:bg-blue-500 transform-gpu transition-all h-full flex items-center">
      {children}
    </div>
  );
}
