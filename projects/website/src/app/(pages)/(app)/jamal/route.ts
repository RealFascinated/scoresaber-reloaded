// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { generateHeapSnapshot } from "bun";

export async function GET(request: Request) {
  const snapshot = generateHeapSnapshot("v8");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  return new Response(JSON.stringify(snapshot, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="heap-snapshot-${timestamp}.json"`,
    },
  });
}
