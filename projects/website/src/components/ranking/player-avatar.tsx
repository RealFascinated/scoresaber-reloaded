export function PlayerAvatar({
  profilePicture,
  name,
  className,
}: {
  profilePicture: string;
  name: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <img
        src={profilePicture}
        alt={name}
        className="h-7 w-7 rounded-full border border-[#333] object-cover"
      />
    </div>
  );
}
