const CHANNEL_NAME = "concourse-workspace";
const LOCAL_EVENT = "concourse:workspace-event";
const STORAGE_KEY = "concourse:workspace-event";
const channel = typeof BroadcastChannel === "function" ? new BroadcastChannel(CHANNEL_NAME) : null;

export function publishWorkspaceEvent(event) {
  const message = { ...event, eventId: crypto.randomUUID() };
  window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: message }));
  if (channel) channel.postMessage(message);
  else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(message));
}

export function subscribeWorkspaceEvents(listener) {
  const receiveLocal = (event) => listener(event.detail);
  const receiveChannel = (event) => listener(event.data);
  const receiveStorage = (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try { listener(JSON.parse(event.newValue)); } catch { /* Ignore malformed local data. */ }
  };

  window.addEventListener(LOCAL_EVENT, receiveLocal);
  if (channel) channel.addEventListener("message", receiveChannel);
  else window.addEventListener("storage", receiveStorage);

  return () => {
    window.removeEventListener(LOCAL_EVENT, receiveLocal);
    if (channel) channel.removeEventListener("message", receiveChannel);
    else window.removeEventListener("storage", receiveStorage);
  };
}

export function publishApplicationUpsert(record) {
  publishWorkspaceEvent({ resource: "applications", action: "upsert", record });
}

export function publishApplicationDelete(id) {
  publishWorkspaceEvent({ resource: "applications", action: "delete", id });
}
