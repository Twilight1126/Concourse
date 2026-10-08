import { getAccessToken, readJson, workerErrorResponse } from "../../http/worker.js";
import { createOutreachService } from "./outreach.service.js";
import { createSupabaseOutreachRepository } from "./repositories/supabase.repository.js";

export async function handleOutreachRequest(request, env, pathname) {
  const token = getAccessToken(request);
  if (!token) {
    return Response.json(
      { error: { code: "AUTH_REQUIRED", message: "Sign in is required." } },
      { status: 401 },
    );
  }

  const id = pathname.match(/^\/api\/outreach\/(\d+)$/)?.[1];
  try {
    const service = createOutreachService(createSupabaseOutreachRepository(env, token));
    if (pathname === "/api/outreach" && request.method === "GET") {
      return Response.json({ data: await service.list() });
    }
    if (pathname === "/api/outreach" && request.method === "POST") {
      return Response.json({ data: await service.create(await readJson(request)) }, { status: 201 });
    }
    if (id && request.method === "GET") return Response.json({ data: await service.get(id) });
    if (id && request.method === "PATCH") {
      return Response.json({ data: await service.update(id, await readJson(request)) });
    }
    if (id && request.method === "DELETE") {
      await service.remove(id);
      return new Response(null, { status: 204 });
    }
    return Response.json({ error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." } }, { status: 405 });
  } catch (error) {
    return workerErrorResponse(error);
  }
}
