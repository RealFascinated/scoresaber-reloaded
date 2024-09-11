type BeatSaverLogoProps = {
  size?: number;
  className?: string;
};

export default function BeatSaverLogo({ size = 32, className }: BeatSaverLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      version="1.1"
      className={className}
    >
      <g fill="none" stroke="#fff" strokeWidth="10">
        <path d="M 100,7 189,47 100,87 12,47 Z" strokeLinejoin="round"></path>
        <path d="M 189,47 189,155 100,196 12,155 12,47" strokeLinejoin="round"></path>
        <path d="M 100,87 100,196" strokeLinejoin="round"></path>
        <path d="M 26,77 85,106 53,130 Z" strokeLinejoin="round"></path>
      </g>
    </svg>
  );
}
