import { getSchedule } from "@/lib/queries";

// Cache the response and refresh from Neon at most once per minute.
export const revalidate = 60;

export async function GET() {
  const data = await getSchedule();
  return Response.json(data);
}
