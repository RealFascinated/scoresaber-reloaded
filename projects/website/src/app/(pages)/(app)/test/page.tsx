// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { heapStats } from "bun:jsc";

export default function Test() {
  return (
    <div>
      {JSON.stringify(heapStats(), null, 2)
        .split("\n")
        .map((line, index) => (
          <p key={index}>{line}</p>
        ))}
    </div>
  );
}
