import { handleApplicationsRequest } from "./modules/applications/applications.worker.js";
import { handleProfileRequest } from "./modules/profile/profile.worker.js";
import { handleOutreachRequest } from "./modules/outreach/outreach.worker.js";
import { handleAdminRequest } from "./modules/admin/admin.worker.js";
import { handleDashboardRequest } from "./modules/dashboard/dashboard.worker.js";

export default {
  async fetch(request, env) {
    const started = performance.now();
    const isApiRequest = new URL(request.url).pathname.startsWith("/api/");
    let status = 500;
    try {
      if (isApiRequest && env.API_RATE_LIMIT) {
        try {
          const authorization = request.headers.get("Authorization") || "";
          const actor = authorization.startsWith("Bearer ")
            ? authorization
            : `anonymous:${request.headers.get("CF-Connecting-IP") || "unknown"}`;
          const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(actor));
          const key = Array.from(new Uint8Array(digest).slice(0, 16), (byte) => byte.toString(16).padStart(2, "0")).join("");
          const { success } = await env.API_RATE_LIMIT.limit({ key });
          if (!success) {
            status = 429;
            return Response.json(
              { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again shortly." } },
              { status, headers: { "Cache-Control": "no-store", "Retry-After": "60" } },
            );
          }
        } catch (error) {
          console.error("API rate limiter unavailable", error);
        }
      }
      const response = await routeRequest(request, env);
      status = response.status;
      if (isApiRequest) response.headers.set("Cache-Control", "no-store");
      return response;
    } finally {
      if (isApiRequest) {
        try {
          env.API_METRICS?.writeDataPoint({
            blobs: [request.method],
            doubles: [status, performance.now() - started],
          });
        } catch (error) {
          console.error("API metrics write failed", error);
        }
      }
    }
  },
};

async function routeRequest(request, env) {
    const { pathname } = new URL(request.url);

    if (request.method === "GET" && pathname === "/api/health") {
      return Response.json({ status: "ok", service: "concourse-api" });
    }

    if (
      pathname === "/api/applications" ||
      pathname.startsWith("/api/applications/")
    ) {
      return handleApplicationsRequest(request, env, pathname);
    }

    if (pathname === "/api/profile") {
      return handleProfileRequest(request, env);
    }

    if (pathname === "/api/dashboard" && request.method === "GET") {
      return handleDashboardRequest(request, env);
    }

    if (pathname === "/api/outreach" || pathname.startsWith("/api/outreach/")) {
      return handleOutreachRequest(request, env, pathname);
    }

    if (pathname.startsWith("/api/admin/")) {
      return handleAdminRequest(request, env, pathname);
    }

    if (pathname.startsWith("/api/")) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "API route not found." } },
        { status: 404 },
      );
    }

    return env.ASSETS.fetch(request);
}
