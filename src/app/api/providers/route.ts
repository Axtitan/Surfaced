import { demoMode, providerStatus } from "@/lib/providers";
import { CATALOG_SYNCED } from "@/lib/plan";
import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

// Public while no AI keys are set in production (F-17). Requires a session once accounts exist.
export const GET = route({
  auth: "public",
  handler: async () => ({ providers: providerStatus(), demo: demoMode(), catalogSynced: CATALOG_SYNCED }),
});
