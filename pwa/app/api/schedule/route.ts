import { etagPayload, etagResponse } from "@/lib/etag";
import { getSchedule } from "@/lib/queries";

// Conditional GET: unchanged data costs the clients a bodyless 304. The
// payload memo inside refreshes from Neon at most once per minute.
const payload = etagPayload(getSchedule);

export async function GET(request: Request) {
  return etagResponse(request, payload);
}
