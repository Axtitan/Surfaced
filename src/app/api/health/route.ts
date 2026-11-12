import { route } from "@/server/http/route";

export const dynamic = "force-dynamic";

/** For uptime monitors. Says nothing about configuration (§8.2). */
export const GET = route({ auth: "public", handler: async () => ({ ok: true }) });
