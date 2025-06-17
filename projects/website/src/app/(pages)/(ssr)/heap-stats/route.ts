import { heapStats } from "bun:jsc";

export async function GET() {
  const stats = heapStats();

  return Response.json({
    stats,
  });
}
