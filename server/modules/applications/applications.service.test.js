import assert from "node:assert/strict";
import test from "node:test";
import { createApplicationsService } from "./applications.service.js";

function repository() {
  let records = [];
  let updates = [];
  return {
    findAll: async () => records,
    findById: async (id) => records.find((record) => String(record.id) === String(id)) ?? null,
    insert: async (record) => { const saved = { id: 1, ...record }; records = [saved]; return saved; },
    update: async (id, record) => { const saved = { id: Number(id), ...record }; records = [saved]; return saved; },
    remove: async () => true,
    findUpdates: async (applicationId) => updates.filter((item) => String(item.application_id) === String(applicationId)),
    findUpdate: async (applicationId, updateId) => updates.find((item) => String(item.application_id) === String(applicationId) && String(item.id) === String(updateId)) ?? null,
    insertUpdate: async (update) => {
      const saved = { id: updates.length + 1, ...update };
      updates = [saved, ...updates];
      return saved;
    },
    updateUpdate: async (applicationId, updateId, changes) => {
      const saved = { ...updates.find((item) => String(item.id) === String(updateId) && String(item.application_id) === String(applicationId)), ...changes };
      updates = updates.map((item) => String(item.id) === String(updateId) ? saved : item);
      return saved;
    },
    removeUpdate: async (applicationId, updateId) => {
      const before = updates.length;
      updates = updates.filter((item) => String(item.application_id) !== String(applicationId) || String(item.id) !== String(updateId));
      return updates.length < before;
    },
  };
}

test("all sources shows the owner's applications", async () => {
  let filters;
  const service = createApplicationsService({
    findPage: async (options) => { filters = options; return { items: [], total: 42 }; },
  });
  await service.page({ page: "1", search: "", status: "all", source: "all" });
  assert.equal(filters.status, null);
  assert.equal(filters.source, null);
});

test("normalizes a captured application", async () => {
  const service = createApplicationsService(repository());
  const application = await service.create({
    company_name: " Microsoft ", job_title: " Software Engineer ",
    source: "LinkedIn", experience_min: "2", experience_max: "4",
    salary_min: "1200000", salary_currency: "inr", expected_salary: "1600000",
    experience_required: "2–4 years", salary_budget: "₹12–18 LPA",
    resume_filename: "Chirag_Resume.pdf",
  });

  assert.equal(application.company_name, "Microsoft");
  assert.equal(application.experience_min, 2);
  assert.equal(application.salary_currency, "INR");
  assert.equal(application.experience_required, "2–4 years");
  assert.equal(application.salary_budget, "₹12–18 LPA");
  assert.equal(application.resume_filename, "Chirag_Resume.pdf");
  assert.equal(application.expected_salary, 1600000);
});

test("rejects negative compensation", async () => {
  const service = createApplicationsService(repository());
  assert.throws(
    () => service.create({ company_name: "Microsoft", job_title: "Engineer", salary_min: -1 }),
    { code: "VALIDATION_ERROR" },
  );
});

test("sets the applied date when a saved application becomes applied", async () => {
  const service = createApplicationsService(repository());
  const saved = await service.create({ company_name: "Example", job_title: "Engineer" });
  assert.equal(saved.applied_at, null);
  const applied = await service.update(saved.id, { status: "applied", applied_at: "" });
  assert.ok(applied.applied_at instanceof Date);
  const reviewed = await service.update(saved.id, { next_action: "Contact recruiter" });
  assert.equal(reviewed.applied_at.getTime(), applied.applied_at.getTime());
});

test("keeps the application date while tracking interview and rejection details", async () => {
  const service = createApplicationsService(repository());
  const saved = await service.create({ company_name: "Example", job_title: "Engineer", status: "applied" });
  const interviewing = await service.update(saved.id, {
    status: "interviewing", interview_stage: "Technical interview", interview_at: "2026-10-10T10:00:00Z",
  });
  assert.equal(interviewing.interview_stage, "Technical interview");
  assert.equal(interviewing.interview_at.toISOString(), "2026-10-10T10:00:00.000Z");
  assert.equal(interviewing.applied_at.getTime(), saved.applied_at.getTime());
  const rejected = await service.update(saved.id, { status: "rejected", rejection_reason: "Role closed" });
  assert.equal(rejected.rejection_reason, "Role closed");
  assert.equal(rejected.interview_stage, "Technical interview");
  assert.equal(rejected.applied_at.getTime(), saved.applied_at.getTime());
});

test("allows an unknown rejection reason without inventing one", async () => {
  const service = createApplicationsService(repository());
  const saved = await service.create({ company_name: "Example", job_title: "Engineer" });
  const rejected = await service.update(saved.id, { status: "rejected" });
  assert.equal(rejected.rejection_reason, null);
});

test("supports offer, withdrawal, and no-response outcomes without losing the application date", async () => {
  for (const outcome of ["offered", "withdrawn", "ghosted"]) {
    const service = createApplicationsService(repository());
    const applied = await service.create({ company_name: "Example", job_title: "Engineer", status: "applied" });
    const updated = await service.update(applied.id, { status: outcome });
    assert.equal(updated.status, outcome);
    assert.equal(updated.applied_at.getTime(), applied.applied_at.getTime());
  }
});

test("rejects invalid interview dates and overlong reasons", async () => {
  const service = createApplicationsService(repository());
  const saved = await service.create({ company_name: "Example", job_title: "Engineer" });
  await assert.rejects(service.update(saved.id, { interview_at: "not-a-date" }), { code: "VALIDATION_ERROR" });
  await assert.rejects(service.update(saved.id, { rejection_reason: "x".repeat(501) }), { code: "VALIDATION_ERROR" });
});

test("adds, edits, and deletes a dated update without changing the application status", async () => {
  const service = createApplicationsService(repository());
  const application = await service.create({ company_name: "Example", job_title: "Engineer", status: "screening" });
  const update = await service.createUpdate(application.id, { title: "Recruiter call", happened_at: "2026-10-06T09:30:00Z", details: "Discussed availability" });
  assert.equal(update.status, "screening");
  assert.equal(update.title, "Recruiter call");
  assert.equal((await service.listUpdates(application.id)).length, 1);
  const edited = await service.editUpdate(application.id, update.id, { title: "Phone screen", happened_at: "2026-10-06T10:00:00Z", details: "Discussed role" });
  assert.equal(edited.title, "Phone screen");
  assert.equal((await service.get(application.id)).status, "screening");
  await service.removeUpdate(application.id, update.id);
  assert.deepEqual(await service.listUpdates(application.id), []);
});

test("records multiple interview rounds under the same stage", async () => {
  const service = createApplicationsService(repository());
  const application = await service.create({ company_name: "Example", job_title: "Engineer", status: "interviewing" });
  await service.createUpdate(application.id, { title: "Technical round", happened_at: "2026-10-06T09:30:00Z" });
  await service.createUpdate(application.id, { title: "Manager round", happened_at: "2026-10-07T09:30:00Z" });
  const updates = await service.listUpdates(application.id);
  assert.equal(updates.length, 2);
  assert.ok(updates.every((update) => update.status === "interviewing"));
  assert.equal((await service.get(application.id)).status, "interviewing");
});

test("requires a real application, date, and title for stage updates", async () => {
  const service = createApplicationsService(repository());
  const application = await service.create({ company_name: "Example", job_title: "Engineer" });
  await assert.rejects(service.createUpdate(application.id, { title: "Call", happened_at: "2026-10-06" }), { code: "VALIDATION_ERROR" });
  await service.update(application.id, { status: "screening" });
  await assert.rejects(service.createUpdate(application.id, { title: "", happened_at: "2026-10-06" }), { code: "VALIDATION_ERROR" });
  await assert.rejects(service.createUpdate(application.id, { title: "Call" }), { code: "VALIDATION_ERROR" });
  await assert.rejects(service.listUpdates(999), { code: "APPLICATION_NOT_FOUND" });
});
