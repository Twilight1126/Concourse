import { createApplicationsService } from "./applications.service.js";
import { createSupabaseApplicationsRepository } from "./repositories/supabase.repository.js";

function accessToken(request) {
  const [scheme, token] = (request.headers.get("Authorization") ?? "").split(" ");
  return scheme === "Bearer" ? token : null;
}

async function json(request) {
  try {
    return await request.json();
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.status = 400;
    error.code = "INVALID_JSON";
    throw error;
  }
}

function errorResponse(error) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  return Response.json(
    {
      error: {
        code: error.code ?? "INTERNAL_SERVER_ERROR",
        message: status >= 500 ? "Something went wrong." : error.message,
      },
    },
    { status },
  );
}

export async function handleApplicationsRequest(request, env, pathname) {
  const token = accessToken(request);
  if (!token) {
    return Response.json(
      { error: { code: "AUTH_REQUIRED", message: "Sign in is required." } },
      { status: 401 },
    );
  }

  const applicationId = pathname.match(/^\/api\/applications\/(\d+)$/)?.[1];

  try {
    const service = createApplicationsService(
      createSupabaseApplicationsRepository(env, token),
    );
    if (pathname === "/api/applications" && request.method === "GET") {
      return Response.json({ data: await service.list() });
    }
    if (pathname === "/api/applications" && request.method === "POST") {
      return Response.json({ data: await service.create(await json(request)) }, { status: 201 });
    }
    if (applicationId && request.method === "GET") {
      return Response.json({ data: await service.get(applicationId) });
    }
    if (applicationId && request.method === "PATCH") {
      return Response.json({ data: await service.update(applicationId, await json(request)) });
    }
    if (applicationId && request.method === "DELETE") {
      await service.remove(applicationId);
      return new Response(null, { status: 204 });
    }
    return Response.json(
      { error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." } },
      { status: 405 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
