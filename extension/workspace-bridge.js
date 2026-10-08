(function initializeWorkspaceBridge() {
const WEB_SOURCE = "concourse-web";
const EXTENSION_SOURCE = "concourse-extension";

function requestFromPage(type, payload = {}, timeoutMs = 15_000) {
  const requestId = crypto.randomUUID();
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", receive);
      resolve({ ok: false, error: "Concourse did not respond. Refresh the workspace and try again." });
    }, timeoutMs);

    function receive(event) {
      if (event.source !== window || event.data?.source !== WEB_SOURCE || event.data.requestId !== requestId) return;
      window.clearTimeout(timeout);
      window.removeEventListener("message", receive);
      resolve(event.data);
    }

    window.addEventListener("message", receive);
    window.postMessage({ source: EXTENSION_SOURCE, type, requestId, ...payload });
  });
}

const requestHandlers = {
  GET_EXTENSION_CONNECTION: () => requestFromPage(
    "CONCOURSE_EXTENSION_CONNECTION",
    {},
    3_000,
  ),
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handle = requestHandlers[message.type];
  if (!handle) return;
  handle(message).then(sendResponse);
  return true;
});

})();
