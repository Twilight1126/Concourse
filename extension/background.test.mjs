import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("./background.js", import.meta.url), "utf8");

function harness(fetch, options = {}) {
  const local = {
    workspaceUrl: "http://localhost:8787",
    workspaceConnection: {
      workspaceUrl: "http://localhost:8787",
      apiUrl: "http://localhost:4000/api",
      authMode: "supabase",
      userId: "local-user",
      accessToken: "local-test-token",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    },
  };
  const pageConnection = options.pageConnection || { ...local.workspaceConnection };
  const session = {};
  let listener;
  const area = (values) => ({
    async get(input) {
      if (typeof input === "string") return { [input]: values[input] };
      if (Array.isArray(input)) return Object.fromEntries(input.map((key) => [key, values[key]]));
      return Object.fromEntries(Object.entries(input).map(([key, fallback]) => [key, values[key] ?? fallback]));
    },
    async set(changes) { Object.assign(values, changes); },
    async remove(key) { delete values[key]; },
  });
  const chrome = {
    storage: { local: area(local), session: area(session) },
    runtime: { onMessage: { addListener(value) { listener = value; } } },
    tabs: {
      async query() { return options.tabs || [{ id: 1, url: "http://localhost:8787/dashboard" }]; },
      async sendMessage(_tabId) { return { ok: true, connection: pageConnection }; },
      onRemoved: { addListener() {} },
    },
  };
  vm.runInNewContext(source, { chrome, fetch, URL, AbortSignal, console, setTimeout, clearTimeout });

  const send = (message, tab = { id: 7 }) => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`No response for ${message.type}`)), 1_000);
    listener(message, { tab }, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
  send.setStoredConnection = (connection) => { local.workspaceConnection = connection; };
  send.getStoredConnection = () => local.workspaceConnection;
  return send;
}

test("keeps reviewed fields for one job and clears them for the next job", async () => {
  const send = harness(async () => { throw new Error("Unexpected request"); });
  const first = {
    type: "application",
    data: {
      source: "LinkedIn",
      job_url: "https://www.linkedin.com/jobs/view/111/",
      company_name: "Applicantz",
      job_title: "Full Stack Engineer",
      experience_required: "5-7 years",
    },
  };
  await send({ type: "ENRICH_JOB_CAPTURE", capture: first });
  await send({
    type: "REMEMBER_JOB_CAPTURE",
    capture: { ...first, data: { ...first.data, experience_required: "3+ years", record_id: 41 } },
    editedFields: ["experience_required"],
  });

  const modal = await send({
    type: "ENRICH_JOB_CAPTURE",
    capture: { ...first, data: { ...first.data, experience_required: "5-7 years" } },
  });
  assert.equal(modal.capture.data.experience_required, "3+ years");
  assert.equal(modal.capture.data.record_id, 41);

  const next = await send({
    type: "ENRICH_JOB_CAPTURE",
    capture: {
      ...first,
      data: { ...first.data, job_url: "https://www.linkedin.com/jobs/view/222/", experience_required: "2 years" },
    },
  });
  assert.equal(next.capture.data.experience_required, "2 years");
  assert.equal(next.capture.data.record_id, undefined);
});

test("local save uses the signed-in account and reads its profile", async () => {
  const requests = [];
  const send = harness(async (url, options) => {
    requests.push({ url, token: options?.headers?.Authorization });
    return {
      ok: true,
      status: 201,
      async json() { return { data: url.endsWith("/profile") ? { expected_ctc: 100000 } : { id: 42, company_name: "Cloudflare", job_title: "Engineer", status: "saved" } }; },
    };
  });
  const result = await send({
    type: "SAVE_CAPTURE",
    capture: { type: "application", data: { company_name: "Cloudflare", job_title: "Engineer" } },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(requests, [
    { url: "http://localhost:4000/api/profile", token: "Bearer local-test-token" },
    { url: "http://localhost:4000/api/applications", token: "Bearer local-test-token" },
  ]);
});

test("detects local Concourse and connects without production OAuth", async () => {
  const send = harness(async (url) => ({
    ok: url === "http://localhost:4000/api/health",
    async json() { return {}; },
  }));
  const detected = await send({ type: "RESOLVE_WORKSPACE" });
  assert.equal(detected.workspaceUrl, "http://localhost:8787");
  assert.equal(detected.environment, "Local");
  const connected = await send({ type: "CONNECT_WORKSPACE", workspaceUrl: detected.workspaceUrl });
  assert.equal(connected.ok, true);
  const state = await send({ type: "GET_CONNECTION_STATE", workspaceUrl: detected.workspaceUrl });
  assert.equal(state.connected, true);
});

test("production connects through the signed-in web tab and never stores its token", async () => {
  const workspaceUrl = "https://concourse.chiragb0707.workers.dev";
  const token = "production-test-token";
  const requests = [];
  const send = harness(async (url, options) => {
    requests.push({ url, token: options?.headers?.Authorization });
    return {
      ok: true,
      status: 200,
      async json() { return { data: { id: 42 } }; },
    };
  }, {
    tabs: [{ id: 2, url: `${workspaceUrl}/applications` }],
    pageConnection: {
      workspaceUrl,
      apiUrl: `${workspaceUrl}/api`,
      authMode: "supabase",
      userId: "production-user",
      accessToken: token,
    },
  });

  const detected = await send({ type: "RESOLVE_WORKSPACE" });
  assert.equal(detected.environment, "Production");
  const connected = await send({ type: "CONNECT_WORKSPACE", workspaceUrl });
  assert.equal(connected.ok, true);
  assert.equal(send.getStoredConnection().accessToken, undefined);
  assert.equal(send.getStoredConnection().refreshToken, undefined);

  const saved = await send({
    type: "SAVE_CAPTURE",
    capture: { type: "application", data: { company_name: "Example", job_title: "Engineer" } },
  });
  assert.equal(saved.ok, true);
  assert.ok(requests.every((request) => request.token === `Bearer ${token}`));
  assert.ok(requests.some((request) => request.url.endsWith("/applications")));
});

test("never saves a reviewed local job into a production connection", async () => {
  const send = harness(async () => { throw new Error("No API request should be made"); });
  send.setStoredConnection({
    workspaceUrl: "https://concourse.chiragb0707.workers.dev",
    apiUrl: "https://concourse.chiragb0707.workers.dev/api",
    authMode: "supabase",
  });
  const result = await send({
    type: "SAVE_CAPTURE",
    capture: {
      type: "application",
      workspaceUrl: "http://localhost:8787",
      data: { company_name: "Example", job_title: "Engineer" },
    },
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /another workspace/i);
});

test("keeps the saved Adobe record through its review and thank-you URLs", async () => {
  const send = harness(async () => { throw new Error("Unexpected request"); });
  const reviewed = {
    type: "application",
    data: {
      source: "Adobe Careers",
      job_url: "https://careers.adobe.com/us/en/apply?jobSeqNo=ADOBUSR170393EXTERNALENUS&step=5",
      company_name: "Adobe",
      job_title: "Computer Scientist I - Full Stack",
      experience_required: "4-6 years",
      record_id: 57,
      status: "saved",
    },
  };
  await send({ type: "REMEMBER_JOB_CAPTURE", capture: reviewed, editedFields: ["company_name"] });

  const confirmation = await send({
    type: "ENRICH_JOB_CAPTURE",
    capture: {
      type: "application",
      data: {
        job_url: "https://careers.adobe.com/us/en/applythankyou?status=success&jobSeqNo=ADOBUSR170393EXTERNALENUS",
        company_name: "Skip to main content",
        job_title: "Computer Scientist I - Full Stack",
      },
    },
  });

  assert.equal(confirmation.capture.data.record_id, 57);
  assert.equal(confirmation.capture.data.company_name, "Adobe");
  assert.equal(confirmation.capture.data.experience_required, "4-6 years");
});

test("review save defaults to saved and accepts an explicit applied choice", async () => {
  const requests = [];
  const send = harness(async (url, options) => {
    if (url.endsWith("/profile")) return { ok: true, status: 200, async json() { return { data: { expected_ctc: null } }; } };
    const body = JSON.parse(options.body);
    requests.push({ url, method: options.method, body });
    return {
      ok: true,
      status: options.method === "POST" ? 201 : 200,
      async json() { return { data: { id: 42, status: body.status } }; },
    };
  });

  await send({
    type: "SAVE_CAPTURE",
    capture: { type: "application", data: { company_name: "Adobe", job_title: "Engineer", status: "applied" } },
  });
  await send({
    type: "SAVE_CAPTURE",
    status: "applied",
    capture: { type: "application", data: { company_name: "Adobe", job_title: "Engineer" } },
  });
  await send({
    type: "MARK_CAPTURE_APPLIED",
    capture: { type: "application", data: { record_id: 42, company_name: "Adobe", job_title: "Engineer" } },
  });

  assert.equal(requests[0].method, "POST");
  assert.equal(requests[0].body.status, "saved");
  assert.equal(requests[0].body.applied_at, null);
  assert.equal(requests[1].method, "POST");
  assert.equal(requests[1].body.status, "applied");
  assert.ok(requests[1].body.applied_at);
  assert.equal(requests[2].method, "PATCH");
  assert.equal(requests[2].body.status, "applied");
});

test("keeps one Amazon job across subdomains and releases it for the next job", async () => {
  const send = harness(async () => ({
    ok: true,
    status: 200,
    async json() { return { data: { id: 88, status: "applied" } }; },
  }));
  const saved = {
    type: "application",
    data: {
      source: "Amazon Jobs",
      job_url: "https://www.amazon.jobs/en/jobs/3120411/software-development-engineer-ii",
      company_name: "Amazon",
      job_title: "Software Development Engineer II",
      record_id: 88,
      status: "saved",
    },
  };
  await send({ type: "REMEMBER_JOB_CAPTURE", capture: saved, editedFields: [] });

  const confirmation = await send({
    type: "ENRICH_JOB_CAPTURE",
    capture: {
      type: "application",
      data: {
        job_url: "https://account.amazon.jobs/en-US/applicant/jobs/3120411/summary?result=success",
        company_name: "Skip to main content",
        job_title: "Software Development Engineer II",
      },
    },
  });
  assert.equal(confirmation.capture.data.record_id, 88);
  assert.equal(confirmation.capture.data.company_name, "Amazon");

  await send({ type: "MARK_CAPTURE_APPLIED", capture: confirmation.capture });
  const completed = await send({ type: "ENRICH_JOB_CAPTURE", capture: confirmation.capture });
  assert.equal(completed.capture.data.status, "applied");

  const next = await send({
    type: "ENRICH_JOB_CAPTURE",
    capture: {
      type: "application",
      data: {
        job_url: "https://www.amazon.jobs/en/jobs/9999999/another-role",
        company_name: "Amazon",
        job_title: "Another role",
      },
    },
  });
  assert.equal(next.capture.data.record_id, undefined);
  assert.equal(next.capture.data.job_title, "Another role");
});

test("keeps a reviewed record locked when later application steps scrape unrelated text", async () => {
  const send = harness(async () => { throw new Error("Unexpected request"); });
  const reviewed = {
    type: "application",
    data: {
      source: "Company careers",
      job_url: "https://jobs.example.com/jobs/91/full-stack-engineer",
      company_name: "Example",
      job_title: "Full Stack Engineer",
      location: "Bengaluru",
      record_id: 91,
      status: "applied",
    },
  };
  await send({ type: "REMEMBER_JOB_CAPTURE", capture: reviewed, editedFields: ["location"] });

  const nextStep = await send({
    type: "ENRICH_JOB_CAPTURE",
    capture: {
      type: "application",
      data: {
        job_url: "https://apply.vendor.test/application/questions/2",
        company_name: "Answer these questions",
        job_title: "Experience required",
        location: "Full-time",
      },
    },
  });

  assert.equal(nextStep.capture.data.record_id, 91);
  assert.equal(nextStep.capture.data.company_name, "Example");
  assert.equal(nextStep.capture.data.job_title, "Full Stack Engineer");
  assert.equal(nextStep.capture.data.location, "Bengaluru");

  const differentJob = await send({
    type: "ENRICH_JOB_CAPTURE",
    capture: {
      type: "application",
      data: {
        job_url: "https://jobs.example.com/jobs/92/application",
        company_name: "Example",
        job_title: "Backend Engineer",
      },
    },
  });
  assert.equal(differentJob.capture.data.record_id, undefined);
  assert.equal(differentJob.capture.data.job_title, "Backend Engineer");

  await send({ type: "CLEAR_JOB_CAPTURE" });
  const nextJob = await send({
    type: "ENRICH_JOB_CAPTURE",
    capture: {
      type: "application",
      data: {
        job_url: "https://jobs.example.com/roles/backend-engineer",
        company_name: "Example",
        job_title: "Backend Engineer",
      },
    },
  });
  assert.equal(nextJob.capture.data.record_id, undefined);
  assert.equal(nextJob.capture.data.job_title, "Backend Engineer");
});

test("carries a saved review into an application tab opened from the job page", async () => {
  const send = harness(async () => { throw new Error("Unexpected request"); });
  await send({
    type: "REMEMBER_JOB_CAPTURE",
    capture: {
      type: "application",
      data: {
        source: "Company careers",
        job_url: "https://jobs.example.com/jobs/91/full-stack-engineer",
        company_name: "Example",
        job_title: "Full Stack Engineer",
        record_id: 91,
        status: "saved",
      },
    },
    editedFields: ["company_name"],
  });
  const child = await send({
    type: "ENRICH_JOB_CAPTURE",
    capture: {
      type: "application",
      pageKind: "step",
      data: { job_url: "https://apply.vendor.test/application/questions/2", job_title: "Questions" },
    },
  }, { id: 8, openerTabId: 7 });
  assert.equal(child.capture.data.record_id, 91);
  assert.equal(child.capture.data.company_name, "Example");
  assert.equal(child.capture.data.job_url, "https://jobs.example.com/jobs/91/full-stack-engineer");
});

test("restores a locked review after navigation but not on an unrelated site", async () => {
  const send = harness(async () => { throw new Error("Unexpected request"); });
  await send({
    type: "REMEMBER_JOB_CAPTURE",
    pageUrl: "https://jobs.example.com/jobs/91/full-stack-engineer",
    capture: {
      type: "application",
      data: { job_url: "https://jobs.example.com/jobs/91/full-stack-engineer", company_name: "Example", job_title: "Full Stack Engineer", record_id: 91, status: "saved" },
    },
  });
  const application = await send({ type: "GET_PENDING_JOB_CAPTURE", pageUrl: "https://apply.vendor.test/application/step-2", referrer: "https://jobs.example.com/jobs/91/full-stack-engineer" });
  assert.equal(application.capture.data.record_id, 91);
  const confirmed = await send({ type: "GET_PENDING_JOB_CAPTURE", pageUrl: "https://apply.vendor.test/application/success", referrer: "" });
  assert.equal(confirmed.capture.data.record_id, 91);
  const unrelated = await send({ type: "GET_PENDING_JOB_CAPTURE", pageUrl: "https://unrelated.test/application/success", referrer: "" });
  assert.equal(unrelated.capture, null);
});
