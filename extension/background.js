const CONNECTION_KEY = "workspaceConnection";
const LAST_JOB_KEY = "last-job-capture";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const LOCAL_WORKSPACE = "http://localhost:8787";
const PRODUCTION_WORKSPACE = "https://concourse.chiragb0707.workers.dev";
const DRAFT_LIFETIME_MS = 30 * 60 * 1000;
const LOCKED_LIFETIME_MS = 12 * 60 * 60 * 1000;
const jobCacheKey = (tabId) => `${LAST_JOB_KEY}:${tabId}`;

function sameWorkspace(candidateUrl, workspaceUrl) {
  try {
    const candidate = new URL(candidateUrl);
    const workspace = new URL(workspaceUrl);
    const sameHost = candidate.hostname === workspace.hostname
      || (LOCAL_HOSTS.has(candidate.hostname) && LOCAL_HOSTS.has(workspace.hostname));
    return sameHost
      && candidate.protocol === workspace.protocol
      && candidate.port === workspace.port;
  } catch {
    return false;
  }
}

function isLocalWorkspace(workspaceUrl) {
  try {
    return LOCAL_HOSTS.has(new URL(workspaceUrl).hostname);
  } catch { return false; }
}

async function resolveWorkspace() {
  const tabs = await chrome.tabs.query({});
  const localTab = tabs.find((tab) => sameWorkspace(tab.url, LOCAL_WORKSPACE));
  if (localTab) return { workspaceUrl: new URL(localTab.url).origin, environment: "Local" };
  try {
    const response = await fetch("http://localhost:4000/api/health", { signal: AbortSignal.timeout(1000) });
    if (response.ok) return { workspaceUrl: LOCAL_WORKSPACE, environment: "Local" };
  } catch { /* Local API is not running. */ }
  return { workspaceUrl: PRODUCTION_WORKSPACE, environment: "Production" };
}

function validatedConnection(connection, workspaceUrl) {
  if (!sameWorkspace(connection.workspaceUrl, workspaceUrl)) {
    throw new Error("The Concourse tab belongs to a different workspace.");
  }
  const api = new URL(connection.apiUrl);
  const local = isLocalWorkspace(workspaceUrl);
  if (local
    ? !LOCAL_HOSTS.has(api.hostname) || api.port !== "4000"
    : api.origin !== new URL(workspaceUrl).origin) {
    throw new Error("This workspace points to the wrong API. Check its environment settings.");
  }
  return connection;
}

async function readWorkspaceConnection(workspaceUrl) {
  const tabs = await chrome.tabs.query({});
  const tab = tabs.find((candidate) => sameWorkspace(candidate.url, workspaceUrl));
  if (!tab) return null;
  const result = await sendToWorkspace(tab.id, { type: "GET_EXTENSION_CONNECTION" });
  return result?.ok && result.connection
    ? validatedConnection(result.connection, workspaceUrl)
    : null;
}

async function sendToWorkspace(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["workspace-bridge.js"],
    });
    return chrome.tabs.sendMessage(tabId, message);
  }
}

async function connectWorkspace(workspaceUrl) {
  const tabs = await chrome.tabs.query({});
  const workspaceTab = tabs.find((tab) => sameWorkspace(tab.url, workspaceUrl));

  if (!workspaceTab) {
    await chrome.tabs.create({ url: workspaceUrl, active: true });
    return {
      ok: false,
      error: "Concourse opened. Sign in there, then click Connect again.",
    };
  }

  const result = await sendToWorkspace(workspaceTab.id, { type: "GET_EXTENSION_CONNECTION" });
  if (!result?.ok || !result.connection) {
    return {
      ok: false,
      error: result?.error || "Sign in to Concourse, then click Connect again.",
    };
  }

  const candidate = validatedConnection(result.connection, workspaceUrl);
  const connection = isLocalWorkspace(workspaceUrl)
    ? candidate
    : await authenticateExtension(candidate);
  if (isLocalWorkspace(workspaceUrl) && !connection.accessToken) {
    throw new Error("Sign in to local Concourse before connecting.");
  }
  await chrome.storage.local.set({
    [CONNECTION_KEY]: isLocalWorkspace(workspaceUrl)
      ? { ...connection, accessToken: null }
      : connection,
  });
  return { ok: true };
}

async function authenticateExtension(connection) {
  if (!connection.supabaseUrl || !connection.supabaseKey) {
    throw new Error("Production authentication is not configured.");
  }

  const redirectUrl = chrome.identity.getRedirectURL("supabase-auth");
  const authorizationUrl = new URL(
    `${connection.supabaseUrl.replace(/\/$/, "")}/auth/v1/authorize`,
  );
  authorizationUrl.searchParams.set("provider", "google");
  authorizationUrl.searchParams.set("redirect_to", redirectUrl);

  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authorizationUrl.href,
    interactive: true,
  });
  if (!responseUrl) throw new Error("Extension sign-in was cancelled.");

  const callback = new URL(responseUrl);
  const params = new URLSearchParams(callback.hash.slice(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const expiresIn = Number(params.get("expires_in"));
  const authError = params.get("error_description") || params.get("error");

  if (authError || !accessToken || !refreshToken) {
    throw new Error(authError || "Extension sign-in did not return a session.");
  }

  const userResponse = await fetch(
    `${connection.supabaseUrl.replace(/\/$/, "")}/auth/v1/user`,
    {
      headers: {
        apikey: connection.supabaseKey,
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  const user = await userResponse.json().catch(() => ({}));
  if (!userResponse.ok) throw new Error("Could not verify the extension account.");
  if (connection.userId && user.id !== connection.userId) {
    throw new Error(`Connect with ${connection.userEmail || "the same Concourse account"}.`);
  }

  return {
    ...connection,
    accessToken,
    refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + (expiresIn || 3600),
  };
}

async function connectionState(workspaceUrl) {
  try {
    const connection = await authenticatedConnection(workspaceUrl);
    const response = await fetch(`${connection.apiUrl}/health`, {
      headers: connection.accessToken
        ? { Authorization: `Bearer ${connection.accessToken}` }
        : {},
      signal: AbortSignal.timeout(3_000),
    });
    return {
      connected: response.ok,
      error: response.ok ? null : "Concourse is connected, but its API is unavailable.",
    };
  } catch (error) {
    return { connected: false, error: error.message || "Concourse is unavailable." };
  }
}

async function authenticatedConnection(workspaceUrl) {
  const stored = await chrome.storage.local.get(CONNECTION_KEY);
  const connection = stored[CONNECTION_KEY];

  if (!connection || !sameWorkspace(connection.workspaceUrl, workspaceUrl)) {
    throw new Error("Connect this workspace from the Concourse extension first.");
  }
  if (connection.authMode !== "supabase") throw new Error("Reconnect Concourse to use your signed-in account.");
  validatedConnection(connection, workspaceUrl);
  if (isLocalWorkspace(workspaceUrl)) {
    const current = await readWorkspaceConnection(workspaceUrl);
    if (!current?.accessToken || current.userId !== connection.userId) {
      throw new Error("Sign in to the same local Concourse account, then reconnect.");
    }
    return current;
  }
  if (connection.accessToken && connection.expiresAt * 1000 > Date.now() + 60_000) {
    return connection;
  }
  if (!connection.refreshToken || !connection.supabaseUrl || !connection.supabaseKey) {
    throw new Error("Your extension session expired. Connect Concourse again.");
  }

  const response = await fetch(
    `${connection.supabaseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        apikey: connection.supabaseKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: connection.refreshToken }),
    },
  );

  if (!response.ok) {
    await chrome.storage.local.remove(CONNECTION_KEY);
    throw new Error("Your extension session expired. Connect Concourse again.");
  }

  const session = await response.json();
  const refreshed = {
    ...connection,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + session.expires_in,
  };
  await chrome.storage.local.set({ [CONNECTION_KEY]: refreshed });
  return refreshed;
}

async function saveCapture(capture, tabId, statusOverride) {
  const stored = await chrome.storage.local.get(CONNECTION_KEY);
  const workspaceUrl = stored[CONNECTION_KEY]?.workspaceUrl;
  if (!workspaceUrl) throw new Error("Connect Concourse before saving this job.");
  if (capture.workspaceUrl && !sameWorkspace(capture.workspaceUrl, workspaceUrl)) {
    throw new Error("This job was reviewed in another workspace. Reload the job page before saving.");
  }
  const connection = await authenticatedConnection(workspaceUrl);
  const endpoint = capture.type === "application" ? "applications"
    : capture.type === "outreach" ? "outreach"
      : null;
  if (!endpoint) throw new Error("This capture type is not supported.");

  const headers = {
    ...(connection.accessToken
      ? { Authorization: `Bearer ${connection.accessToken}` }
      : {}),
  };
  let expectedSalary = "";
  if (capture.type === "application" && connection.accessToken) {
    const profileResponse = await fetch(`${connection.apiUrl}/profile`, { headers });
    if (profileResponse.ok) {
      const profileBody = await profileResponse.json();
      expectedSalary = profileBody.data?.expected_ctc || expectedSalary;
    }
  }

  const recordId = capture.data.record_id;
  const captureData = { ...capture.data };
  delete captureData.record_id;
  const data = capture.type === "application"
    ? {
        ...captureData,
        expected_salary: capture.data.expected_salary
          || expectedSalary
          || "",
        status: statusOverride || "saved",
        applied_at: statusOverride === "applied"
          ? capture.data.applied_at || new Date().toISOString()
          : null,
      }
    : captureData;

  const response = await fetch(`${connection.apiUrl}/${endpoint}${recordId ? `/${recordId}` : ""}`, {
    method: recordId ? "PATCH" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(data),
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) await chrome.storage.local.remove(CONNECTION_KEY);
    throw new Error(body.error?.message || "Could not save this record.");
  }
  if (capture.type === "application" && data.status === "applied") {
    const key = jobCacheKey(tabId);
    const stored = await chrome.storage.session.get(key);
    await chrome.storage.session.set({
      [key]: {
        savedAt: Date.now(),
        editedFields: stored[key]?.editedFields || [],
        workspaceUrl,
        data: {
          ...(stored[key]?.data || {}),
          ...capture.data,
          ...body.data,
          record_id: body.data.id,
          status: "applied",
        },
      },
    });
  }
  return body.data;
}

function normalizedTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b(?:india|usa|uk|remote)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchingTitles(first, second) {
  const leftTitle = normalizedTitle(first);
  const rightTitle = normalizedTitle(second);
  if (!leftTitle || !rightTitle) return false;
  if (leftTitle.includes(rightTitle) || rightTitle.includes(leftTitle)) return true;
  const left = new Set(leftTitle.split(" "));
  const right = new Set(rightTitle.split(" "));
  const shared = [...left].filter((word) => right.has(word)).length;
  return shared / Math.max(left.size, right.size) >= 0.6;
}

function jobReference(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.endsWith("amazon.jobs") ? "amazon.jobs" : url.hostname;
    const identifiers = new Set([
      "currentjobid", "gh_jid", "jobid", "job_id", "jobseqno",
      "requisitionid", "requisition_id", "requisitionnumber", "reqid", "jobreqid",
    ]);
    const queryId = [...url.searchParams]
      .find(([name, id]) => identifiers.has(name.toLowerCase()) && id)?.[1];
    const explicitId = url.pathname.match(/\/jobs\/(?:view\/)?(\d+)(?:\/|$)/i)?.[1] || queryId;
    return {
      key: (explicitId
        ? `${host}:${explicitId}`
        : `${host}${url.pathname}`.replace(/\/$/, "")).toLowerCase(),
      strong: Boolean(explicitId),
    };
  } catch {
    return {
      key: String(value || "").split(/[?#]/)[0].replace(/\/$/, "").toLowerCase(),
      strong: false,
    };
  }
}

function sameJob(first, second, allowApplicationTransition = false) {
  const firstReference = jobReference(first.job_url);
  const secondReference = jobReference(second.job_url);
  if (firstReference.strong && secondReference.strong) {
    return firstReference.key === secondReference.key;
  }
  if (firstReference.key && firstReference.key === secondReference.key) return true;
  if (!allowApplicationTransition && firstReference.key && secondReference.key) return false;

  const sameCompany = !first.company_name
    || !second.company_name
    || normalizedTitle(first.company_name) === normalizedTitle(second.company_name);
  return sameCompany && matchingTitles(first.job_title, second.job_title);
}

function isApplicationStep(data) {
  const url = String(data.job_url || "");
  const title = String(data.job_title || "");
  return /apply|application|questions|assessment|candidate/i.test(url)
    || /answer (?:these |the )?questions|experience required|review (?:and )?apply/i.test(title);
}

async function enrichJobCapture(capture, tabId, openerTabId) {
  const connection = (await chrome.storage.local.get(CONNECTION_KEY))[CONNECTION_KEY];
  const workspaceUrl = capture.workspaceUrl || connection?.workspaceUrl;
  const key = jobCacheKey(tabId);
  const openerKey = openerTabId ? jobCacheKey(openerTabId) : null;
  const stored = await chrome.storage.session.get(openerKey ? [key, openerKey] : key);
  const previous = stored[key] || (openerKey && stored[openerKey]);
  const cached = previous?.workspaceUrl === workspaceUrl ? previous : null;
  const recent = cached && Date.now() - cached.savedAt
    < (cached.data.record_id ? LOCKED_LIFETIME_MS : DRAFT_LIFETIME_MS);
  const current = capture.data;
  const currentReference = jobReference(current.job_url);
  const cachedReference = jobReference(cached?.data?.job_url);
  const differentStrongJob = currentReference.strong
    && cachedReference.strong
    && currentReference.key !== cachedReference.key;
  const lockedApplication = recent
    && cached.data.record_id
    && isApplicationStep(current)
    && !differentStrongJob;
  const continuation = recent && (
    lockedApplication
    || sameJob(current, cached.data)
    || (isApplicationStep(current) && sameJob(
      { ...current, job_title: current.job_title || cached.data.job_title },
      cached.data,
      true,
    ))
  );
  const data = continuation && cached.data.record_id
    ? cached.data
    : continuation
      ? {
        ...cached.data,
        ...Object.fromEntries(
          Object.entries(current).filter(([key, value]) => (
            value !== "" && value != null && !cached.editedFields?.includes(key)
          )),
        ),
      }
      : current;
  const editedFields = continuation ? cached.editedFields || [] : [];

  if (data.job_title && (data.company_name || data.location)) {
    await chrome.storage.session.set({
      [key]: {
        savedAt: Date.now(),
        data,
        editedFields,
        workspaceUrl,
        lastPageUrl: capture.pageUrl || stored[key]?.lastPageUrl || data.job_url,
      },
    });
  }
  return { ...capture, data, editedFields, workspaceUrl };
}

async function pendingJobCapture(tabId, openerTabId, pageUrl, referrer) {
  const connection = (await chrome.storage.local.get(CONNECTION_KEY))[CONNECTION_KEY];
  const key = jobCacheKey(tabId);
  const openerKey = openerTabId ? jobCacheKey(openerTabId) : null;
  const stored = await chrome.storage.session.get(openerKey ? [key, openerKey] : key);
  const cached = stored[key] || (openerKey && stored[openerKey]);
  if (!cached?.data?.record_id || cached.workspaceUrl !== connection?.workspaceUrl || cached.data.status === "applied"
    || Date.now() - cached.savedAt >= LOCKED_LIFETIME_MS) return null;
  try {
    const previous = new URL(cached.lastPageUrl || cached.data.job_url);
    const current = new URL(pageUrl);
    const linked = current.origin === previous.origin
      || referrer && new URL(referrer).origin === previous.origin;
    const currentReference = jobReference(pageUrl);
    const savedReference = jobReference(cached.data.job_url);
    if (!linked || currentReference.strong && savedReference.strong
      && currentReference.key !== savedReference.key) return null;
  } catch { return null; }
  await chrome.storage.session.set({ [key]: { ...cached, savedAt: Date.now(), lastPageUrl: pageUrl } });
  return { type: "application", pageKind: "step", data: cached.data, editedFields: cached.editedFields || [], workspaceUrl: cached.workspaceUrl };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "RESOLVE_WORKSPACE") {
    resolveWorkspace().then(sendResponse).catch((error) => sendResponse({ error: error.message }));
    return true;
  }
  if (message.type === "CONNECT_WORKSPACE") {
    connectWorkspace(message.workspaceUrl).then(async (result) => {
      if (!result.ok) return sendResponse(result);
      const state = await connectionState(message.workspaceUrl);
      sendResponse({ ok: state.connected, error: state.error });
    }).catch((error) => {
      sendResponse({ ok: false, error: error.message });
    });
    return true;
  }

  if (message.type === "GET_CONNECTION_STATE") {
    connectionState(message.workspaceUrl).then(sendResponse);
    return true;
  }

  if (message.type === "SAVE_CAPTURE" && sender.tab?.id) {
    const status = message.status === "applied" ? "applied" : "saved";
    saveCapture(message.capture, sender.tab.id, status)
      .then((record) => sendResponse({ ok: true, record }))
      .catch((error) => sendResponse({
        ok: false,
        error: error.message || "Could not save this record.",
      }));
    return true;
  }

  if (message.type === "MARK_CAPTURE_APPLIED" && sender.tab?.id) {
    if (!message.capture?.data?.record_id) {
      sendResponse({ ok: false, error: "Save the reviewed details before marking this application as applied." });
      return;
    }
    saveCapture(message.capture, sender.tab.id, "applied")
      .then((record) => sendResponse({ ok: true, record }))
      .catch((error) => sendResponse({
        ok: false,
        error: error.message || "Could not update the application status.",
      }));
    return true;
  }

  if (message.type === "ENRICH_JOB_CAPTURE" && message.capture?.type === "application" && sender.tab?.id) {
    enrichJobCapture(message.capture, sender.tab.id, sender.tab.openerTabId).then((capture) => sendResponse({ capture }));
    return true;
  }

  if (message.type === "GET_PENDING_JOB_CAPTURE" && sender.tab?.id) {
    pendingJobCapture(sender.tab.id, sender.tab.openerTabId, message.pageUrl, message.referrer)
      .then((capture) => sendResponse({ capture }))
      .catch(() => sendResponse({ capture: null }));
    return true;
  }

  if (message.type === "REMEMBER_JOB_CAPTURE" && message.capture?.type === "application" && sender.tab?.id) {
    chrome.storage.local.get(CONNECTION_KEY).then((stored) => chrome.storage.session.set({
      [jobCacheKey(sender.tab.id)]: {
        savedAt: Date.now(),
        data: message.capture.data,
        editedFields: message.editedFields || [],
        workspaceUrl: message.capture.workspaceUrl || stored[CONNECTION_KEY]?.workspaceUrl,
        lastPageUrl: message.pageUrl || message.capture.data.job_url,
      },
    })).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "CLEAR_JOB_CAPTURE" && sender.tab?.id) {
    chrome.storage.session.remove(jobCacheKey(sender.tab.id))
      .then(() => sendResponse({ ok: true }));
    return true;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(jobCacheKey(tabId));
});
