import Link from "next/link";

type EmbedLinksProps = {
  text: string;
};

export default function EmbedLinks({ text }: EmbedLinksProps) {
  // Regular expression to match URLs (simple version)
  const urlRegex = /(https?:\/\/\S+)/g;

  // Split the text by URLs and insert <a> tags for matching URLs
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return (
        <Link
          key={index}
          href={part}
          target="_blank"
          className="text-ssr transition-all hover:brightness-75"
        >
          {part}
        </Link>
      );
    } else {
      return part;
    }
  });
}
