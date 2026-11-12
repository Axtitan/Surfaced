import { demoMode, providerStatus } from "@/lib/providers";
import { CATALOG_SYNCED } from "@/lib/plan";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ providers: providerStatus(), demo: demoMode(), catalogSynced: CATALOG_SYNCED });
}
