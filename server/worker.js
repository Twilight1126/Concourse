import { handleApplicationsRequest } from "./modules/applications/applications.worker.js";
import { handleProfileRequest } from "./modules/profile/profile.worker.js";

export default {
  async fetch(request, env) {
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

    if (pathname.startsWith("/api/")) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "API route not found." } },
        { status: 404 },
      );
    }

    return env.ASSETS.fetch(request);
  },
};
