/* Load test for the public pages and the free endpoints (§15). Never point it at /api/scan or /api/analyze on a
   deployment with AI keys: those cost money per request.
   Run: k6 run -e BASE=https://your-preview.example tests/load/public-pages.k6.js */
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [{ duration: "30s", target: 20 }, { duration: "1m", target: 50 }, { duration: "30s", target: 0 }],
  thresholds: { http_req_failed: ["rate<0.01"], http_req_duration: ["p(95)<800"] },
};

const BASE = __ENV.BASE || "http://localhost:3100";
const PATHS = ["/", "/pricing", "/how-it-works", "/directories", "/tools/ai-crawler-check", "/api/health", "/api/providers"];

export default function () {
  const path = PATHS[Math.floor(Math.random() * PATHS.length)];
  const res = http.get(BASE + path);
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(1);
}
