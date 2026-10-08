import { supabase } from "../../lib/supabase";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const usesLocalApi = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i.test(
  new URL(API_BASE_URL, window.location.origin).href,
);

export function subscribeToApplicationChanges(listener) {
  if (usesLocalApi) {
    let stopped = false;
    let controller;
    let retry;
    async function connect() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session || stopped) return;
        controller = new AbortController();
        const response = await fetch(`${API_BASE_URL}/applications/events`, {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error("Application events unavailable");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
          let end;
          while ((end = buffer.indexOf("\n\n")) >= 0) {
            const message = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            const dataLine = message.split("\n").find((line) => line.startsWith("data: "));
            if (dataLine) listener(JSON.parse(dataLine.slice(6)));
          }
        }
      } catch (error) {
        if (!stopped && error.name !== "AbortError") console.error("Application events disconnected", error);
      }
      if (!stopped) retry = setTimeout(connect, 3_000);
    }
    void connect();
    return () => { stopped = true; controller?.abort(); clearTimeout(retry); };
  }

  if (!supabase) return () => {};

  const channel = supabase
    .channel(`applications:${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "applications" },
      (payload) => {
        if (payload.eventType === "DELETE") {
          listener({ action: "delete", id: payload.old.id });
        } else {
          listener({ action: "upsert", record: payload.new });
        }
      },
    )
    .subscribe();

  return () => { void supabase.removeChannel(channel); };
}
