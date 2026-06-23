import { getLocations } from "@/lib/queries";

export const revalidate = 60;

export async function GET() {
  const data = await getLocations();
  return Response.json(data);
}
