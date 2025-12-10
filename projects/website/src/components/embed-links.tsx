import SimpleLink from "./simple-link";

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
        <SimpleLink
          key={index}
          href={part}
          target="_blank"
          className="text-primary hover:text-primary/80 transition-all"
        >
          {part}
        </SimpleLink>
      );
    } else {
      return part;
    }
  });
}
