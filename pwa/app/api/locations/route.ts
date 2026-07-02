import { etagPayload, etagResponse } from "@/lib/etag";
import { getLocations } from "@/lib/queries";

const payload = etagPayload(getLocations);

export async function GET(request: Request) {
  return etagResponse(request, payload);
}
