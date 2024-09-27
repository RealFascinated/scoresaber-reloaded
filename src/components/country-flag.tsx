type Props = {
  code: string;
  size?: number;
};

export default function CountryFlag({ code, size = 24 }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt="Player Country"
      src={`/assets/flags/${code.toLowerCase()}.png`}
      width={size * 2}
      height={size}
      className={`w-[${size * 2}px] h-[${size}px] object-contain`}
    />
  );
}
