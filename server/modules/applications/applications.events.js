const clients = new Map();

export function publishApplicationEvent(userId, event) {
  const message = `data: ${JSON.stringify(event)}\n\n`;
  for (const response of clients.get(userId) ?? []) response.write(message);
}

export function streamApplicationEvents(request, response) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.write(": connected\n\n");
  const userId = request.identity.id;
  const userClients = clients.get(userId) ?? new Set();
  userClients.add(response);
  clients.set(userId, userClients);

  const heartbeat = setInterval(() => response.write(": keep-alive\n\n"), 25_000);
  const recheckIdentity = setTimeout(() => response.end(), 5 * 60_000);
  request.on("close", () => {
    clearInterval(heartbeat);
    clearTimeout(recheckIdentity);
    userClients.delete(response);
    if (!userClients.size) clients.delete(userId);
  });
}
