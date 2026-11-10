import type { TextOptions } from "@ssr/common/schemas/overlay/overlay-element";

export function TextWidget({ options }: { options: TextOptions }) {
  return <p className="text-4xl font-bold whitespace-pre-wrap">{options.text}</p>;
}
