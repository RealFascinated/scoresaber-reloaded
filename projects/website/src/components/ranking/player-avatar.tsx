type PlayerAvatarProps = {
  profilePicture: string;
  name: string;
  className?: string;
};

export function PlayerAvatar({ profilePicture, name, className }: PlayerAvatarProps) {
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
