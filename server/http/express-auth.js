import { getSupabaseUser } from "../integrations/supabase/auth.js";

export async function requireIdentity(request, _response, next) {
  try {
    const [scheme, token] = (request.headers.authorization ?? "").split(" ");

    if (scheme !== "Bearer" || !token) {
      const error = new Error("Sign in is required.");
      error.status = 401;
      error.code = "AUTH_REQUIRED";
      throw error;
    }

    request.identity = await getSupabaseUser(process.env, token);
    next();
  } catch (error) {
    next(error);
  }
}
