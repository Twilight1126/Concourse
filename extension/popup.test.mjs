import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("./popup.js", import.meta.url), "utf8");
const markup = await readFile(new URL("./popup.html", import.meta.url), "utf8");

test("popup restores and saves the theme, and its close button dismisses it", async () => {
  const elements = Object.fromEntries([
    "connect", "connection-status", "connection-dot", "context-label", "review-page",
    "review-page-status", "theme-toggle", "popup-close",
  ].map((id) => [id, {
    listeners: {}, classList: { toggle() {} },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    setAttribute(name, value) { this[name] = value; },
  }]));
  const icon = { textContent: "" };
  const label = { textContent: "" };
  elements["theme-toggle"].querySelector = (selector) => selector === "[aria-hidden]" ? icon : label;
  const document = {
    documentElement: { dataset: {} },
    querySelector(selector) { return elements[selector.slice(1)]; },
  };
  let savedTheme = "dark";
  let closed = false;
  const chrome = {
    storage: { local: {
      async get() { return { concourseTheme: savedTheme }; },
      async set({ concourseTheme }) { savedTheme = concourseTheme; },
    } },
    runtime: { async sendMessage({ type }) {
      return type === "RESOLVE_WORKSPACE"
        ? { workspaceUrl: "http://localhost:8787", environment: "Local" }
        : { connected: true };
    } },
  };
  vm.runInNewContext(source, {
    chrome, document, matchMedia: () => ({ matches: false }),
    window: { close() { closed = true; } },
  });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(document.documentElement.dataset.theme, "dark");
  assert.equal(label.textContent, "Light mode");
  assert.equal(elements["connection-status"].textContent, "Ready to track applications.");
  assert.match(markup, /Your job search workspace/);
  assert.doesNotMatch(markup, /Connected to Local|Local is detected/);
  elements["theme-toggle"].listeners.click();
  assert.equal(document.documentElement.dataset.theme, "light");
  assert.equal(savedTheme, "light");
  elements["popup-close"].listeners.click();
  assert.equal(closed, true);
});
