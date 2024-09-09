type Props = {
  country: string;
  size?: number;
};

export default function CountryFlag({ country, size = 24 }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt="Player Country" src={`/assets/flags/${country}.png`} className={`h-[${size}px] w-[${size * 2}px]`} />
  );
}
