import assert from "node:assert/strict";
import test from "node:test";
import { createOutreachService } from "./outreach.service.js";

function repository() {
  let record = null;
  return {
    findAll: async () => record ? [record] : [],
    findById: async () => record,
    insert: async (values) => { record = { id: 1, ...values }; return record; },
    update: async (id, values) => { record = { id: Number(id), ...values }; return record; },
    remove: async () => true,
  };
}

test("stores outreach metadata without a body field", async () => {
  const service = createOutreachService(repository());
  const outreach = await service.create({
    contact_name: " Rahul Sharma ", company_name: "Microsoft",
    contact_email: "Rahul.Sharma@Microsoft.com", sender_email: "chirag@example.com",
    subject: "Referral request", resume_filename: "Chirag_Resume.pdf",
    body: "This must not be persisted",
  });

  assert.equal(outreach.contact_name, "Rahul Sharma");
  assert.equal(outreach.contact_email, "rahul.sharma@microsoft.com");
  assert.equal(outreach.resume_filename, "Chirag_Resume.pdf");
  assert.equal(Object.hasOwn(outreach, "body"), false);
});

test("requires valid sender and contact emails", async () => {
  const service = createOutreachService(repository());
  assert.throws(
    () => service.create({ company_name: "Microsoft", contact_email: "invalid", sender_email: "chirag@example.com", subject: "Hello" }),
    { code: "VALIDATION_ERROR" },
  );
});
