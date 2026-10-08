import {
  getAccessToken,
  readJson,
  workerErrorResponse,
} from "../../http/worker.js";
import { getCurrentSupabaseUser, getSupabaseUser } from "../../integrations/supabase/auth.js";
import { createProfileService } from "./profile.service.js";
import { createSupabaseProfileRepository } from "./repositories/supabase.repository.js";

export async function handleProfileRequest(request, env) {
  const token = getAccessToken(request);

  if (!token) {
    return Response.json(
      { error: { code: "AUTH_REQUIRED", message: "Sign in is required." } },
      { status: 401 },
    );
  }

  try {
    const identity = request.method === "PUT" ? await getCurrentSupabaseUser(env, token) : await getSupabaseUser(env, token);
    const service = createProfileService(
      createSupabaseProfileRepository(env, token),
    );

    if (request.method === "GET") {
      return Response.json({ data: await service.get(identity) });
    }

    if (request.method === "PUT") {
      return Response.json({
        data: await service.save(await readJson(request), identity),
      });
    }

    return Response.json(
      { error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." } },
      { status: 405 },
    );
  } catch (error) {
    return workerErrorResponse(error);
  }
}
