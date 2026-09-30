export function getAccessToken(request) {
  const [scheme, token] = (request.headers.get("Authorization") ?? "").split(" ");

  return scheme === "Bearer" ? token : null;
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.status = 400;
    error.code = "INVALID_JSON";
    throw error;
  }
}

export function workerErrorResponse(error) {
  const status = Number.isInteger(error.status) ? error.status : 500;

  if (status >= 500) console.error("Worker request failed", error);

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
