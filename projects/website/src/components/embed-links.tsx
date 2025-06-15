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
          className="text-ssr hover:brightness-75 transition-all "
        >
          {part}
        </Link>
      );
    } else {
      return part;
    }
  });
}
