import {
  getAccessToken,
  readJson,
  workerErrorResponse,
} from "../../http/worker.js";
import { createApplicationsService } from "./applications.service.js";
import { createSupabaseApplicationsRepository } from "./repositories/supabase.repository.js";

export async function handleApplicationsRequest(request, env, pathname) {
  const token = getAccessToken(request);
  if (!token) {
    return Response.json(
      { error: { code: "AUTH_REQUIRED", message: "Sign in is required." } },
      { status: 401 },
    );
  }

  const applicationId = pathname.match(/^\/api\/applications\/(\d+)$/)?.[1];
  const updatesId = pathname.match(/^\/api\/applications\/(\d+)\/updates$/)?.[1];
  const updateMatch = pathname.match(/^\/api\/applications\/(\d+)\/updates\/(\d+)$/);

  try {
    const service = createApplicationsService(
      createSupabaseApplicationsRepository(env, token),
    );
    if (pathname === "/api/applications" && request.method === "GET") {
      return Response.json({ data: await service.list() });
    }
    if (pathname === "/api/applications/page" && request.method === "GET") {
      return Response.json({ data: await service.page(Object.fromEntries(new URL(request.url).searchParams)) });
    }
    if (pathname === "/api/applications" && request.method === "POST") {
      return Response.json({ data: await service.create(await readJson(request)) }, { status: 201 });
    }
    if (applicationId && request.method === "GET") {
      return Response.json({ data: await service.get(applicationId) });
    }
    if (applicationId && request.method === "PATCH") {
      return Response.json({ data: await service.update(applicationId, await readJson(request)) });
    }
    if (applicationId && request.method === "DELETE") {
      await service.remove(applicationId);
      return new Response(null, { status: 204 });
    }
    if (updatesId && request.method === "GET") {
      return Response.json({ data: await service.listUpdates(updatesId) });
    }
    if (updatesId && request.method === "POST") {
      return Response.json({ data: await service.createUpdate(updatesId, await readJson(request)) }, { status: 201 });
    }
    if (updateMatch && request.method === "PATCH") {
      return Response.json({ data: await service.editUpdate(updateMatch[1], updateMatch[2], await readJson(request)) });
    }
    if (updateMatch && request.method === "DELETE") {
      await service.removeUpdate(updateMatch[1], updateMatch[2]);
      return new Response(null, { status: 204 });
    }
    return Response.json(
      { error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." } },
      { status: 405 },
    );
  } catch (error) {
    return workerErrorResponse(error);
  }
}
