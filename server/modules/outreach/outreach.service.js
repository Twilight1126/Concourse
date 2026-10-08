const OUTREACH_STATUSES = new Set([
  "draft",
  "sent",
  "follow_up_due",
  "replied",
  "closed",
]);

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = "VALIDATION_ERROR";
  return error;
}

function requiredText(value, label, maxLength) {
  if (typeof value !== "string" || !value.trim()) {
    throw validationError(`${label} is required.`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) throw validationError(`${label} is too long.`);
  return normalized;
}

function optionalText(value, label, maxLength) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw validationError(`${label} must be text.`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw validationError(`${label} is too long.`);
  return normalized || null;
}

function email(value, label) {
  const normalized = requiredText(value, label, 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw validationError(`${label} must be a valid email address.`);
  }
  return normalized;
}

function optionalDate(value, label) {
  if (!value) return null;
  const result = new Date(value);
  if (Number.isNaN(result.getTime())) throw validationError(`${label} is invalid.`);
  return result;
}

function status(value = "draft") {
  if (!OUTREACH_STATUSES.has(value)) throw validationError("Invalid outreach status.");
  return value;
}

function applicationId(value) {
  if (value === null || value === undefined || value === "") return null;
  if (!/^\d+$/.test(String(value)) || String(value) === "0") {
    throw validationError("Invalid related application ID.");
  }
  return String(value);
}

function outreachId(value) {
  const normalized = applicationId(value);
  if (!normalized) throw validationError("Invalid outreach ID.");
  return normalized;
}

const FIELDS = {
  contact_name: (value) => optionalText(value, "Contact name", 150),
  contact_title: (value) => optionalText(value, "Contact title", 150),
  company_name: (value) => requiredText(value, "Company name", 150),
  contact_email: (value) => email(value, "Contact email"),
  sender_email: (value) => email(value, "Sender email"),
  subject: (value) => requiredText(value, "Subject", 500),
  resume_filename: (value) => optionalText(value, "Resume filename", 255),
  linkedin_url: (value) => optionalText(value, "LinkedIn URL", 2048),
  source: (value) => optionalText(value, "Source", 100) ?? "Gmail",
  contact_source: (value) => optionalText(value, "Contact source", 100),
  outreach_type: (value) => optionalText(value, "Outreach type", 64),
  related_application_id: applicationId,
  status,
  sent_at: (value) => optionalDate(value, "Sent date"),
  follow_up_at: (value) => optionalDate(value, "Follow-up date"),
  notes: (value) => optionalText(value, "Notes", 10000),
};

function normalize(input, current = null) {
  return Object.fromEntries(
    Object.entries(FIELDS).map(([field, normalizeField]) => {
      if (current && !Object.hasOwn(input, field)) return [field, current[field]];
      return [field, normalizeField(input[field])];
    }),
  );
}

function notFoundError() {
  const error = new Error("Outreach record not found.");
  error.status = 404;
  error.code = "OUTREACH_NOT_FOUND";
  return error;
}

export function createOutreachService(repository) {
  return {
    list: () => repository.findAll(),

    async get(id) {
      const record = await repository.findById(outreachId(id));
      if (!record) throw notFoundError();
      return record;
    },

    create: (input) => repository.insert(normalize(input)),

    async update(id, input) {
      const normalizedId = outreachId(id);
      const current = await repository.findById(normalizedId);
      if (!current) throw notFoundError();
      return repository.update(normalizedId, normalize(input, current));
    },

    async remove(id) {
      if (!(await repository.remove(outreachId(id)))) throw notFoundError();
    },
  };
}
