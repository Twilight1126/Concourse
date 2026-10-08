const connectButton = document.querySelector("#connect");
const connectionStatus = document.querySelector("#connection-status");
const connectionDot = document.querySelector("#connection-dot");
const reviewPage = document.querySelector("#review-page");
const reviewPageStatus = document.querySelector("#review-page-status");
const themeToggle = document.querySelector("#theme-toggle");
const popupClose = document.querySelector("#popup-close");
let workspaceUrl = null;

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const dark = theme === "dark";
  themeToggle.querySelector("[aria-hidden]").textContent = dark ? "☀" : "☾";
  themeToggle.querySelector("span:last-child").textContent = dark ? "Light mode" : "Dark mode";
  themeToggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
}

const systemTheme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
applyTheme(systemTheme);
chrome.storage.local.get("concourseTheme").then(({ concourseTheme }) => {
  if (concourseTheme === "dark" || concourseTheme === "light") applyTheme(concourseTheme);
}).catch(() => {});
themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  chrome.storage.local.set({ concourseTheme: next }).catch(() => {});
});
popupClose.addEventListener("click", () => window.close());

reviewPage.addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:\/\//.test(tab.url || "")) throw new Error("Unsupported page");
    let result;
    try {
      result = await chrome.tabs.sendMessage(tab.id, { type: "OPEN_JOB_REVIEW" });
    } catch {
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["job-capture.css"] });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["page-capture.js", "job-capture.js"] });
      result = await chrome.tabs.sendMessage(tab.id, { type: "OPEN_JOB_REVIEW" });
    }
    if (!result?.ok) throw new Error(result?.error || "Could not open the review card.");
    window.close();
  } catch (error) {
    reviewPageStatus.textContent = error.message || "Open a job page and try again.";
  }
});

function showConnection(connected, message = "") {
  connectionDot.classList.toggle("is-connected", connected);
  connectionStatus.textContent = message || (connected
    ? "Ready to track applications."
    : "Sign in to Concourse, then connect.");
  connectionStatus.className = connected ? "is-connected" : "";
  connectButton.textContent = connected ? "Connected" : "Connect to Concourse";
  connectButton.classList.toggle("is-connected", connected);
  connectButton.disabled = connected;
}

async function refreshConnection() {
  const result = await chrome.runtime.sendMessage({
    type: "GET_CONNECTION_STATE",
    workspaceUrl,
  });
  showConnection(result.connected, result.error || "");
  if (!result.connected && result.error) connectionStatus.className = "is-error";
}

async function initialize() {
  connectButton.disabled = true;
  const result = await chrome.runtime.sendMessage({ type: "RESOLVE_WORKSPACE" });
  if (!result?.workspaceUrl) throw new Error(result?.error || "Could not find Concourse.");
  workspaceUrl = result.workspaceUrl;
  await refreshConnection();
}

initialize().catch((error) => {
  showConnection(false, error.message);
  connectionStatus.className = "is-error";
  connectButton.disabled = true;
});

connectButton.addEventListener("click", async () => {
  connectButton.disabled = true;
  connectButton.textContent = "Connecting…";
  connectionStatus.textContent = "Connecting to Concourse…";
  connectionStatus.className = "";
  try {
    const result = await chrome.runtime.sendMessage({
      type: "CONNECT_WORKSPACE",
      workspaceUrl,
    });
    if (result.ok) showConnection(true);
    else {
      showConnection(false, result.error);
      connectionStatus.className = "is-error";
    }
  } catch {
    showConnection(false, "Connection failed. Reload the extension and try again.");
    connectionStatus.className = "is-error";
  }
});
