const APPLICATION_STATUSES = new Set([
  "saved",
  "applied",
  "screening",
  "interviewing",
  "offered",
  "rejected",
  "ghosted",
  "withdrawn",
]);

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = "VALIDATION_ERROR";
  return error;
}

function notFoundError() {
  const error = new Error("Application not found.");
  error.status = 404;
  error.code = "APPLICATION_NOT_FOUND";
  return error;
}

function requiredText(value, label, maxLength) {
  if (typeof value !== "string" || !value.trim()) {
    throw validationError(`${label} is required.`);
  }
  const result = value.trim();
  if (result.length > maxLength) throw validationError(`${label} is too long.`);
  return result;
}

function optionalText(value, label, maxLength) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw validationError(`${label} must be text.`);
  const result = value.trim();
  if (result.length > maxLength) throw validationError(`${label} is too long.`);
  return result || null;
}

function status(value = "saved") {
  if (typeof value !== "string" || !APPLICATION_STATUSES.has(value)) {
    throw validationError("Invalid application status.");
  }
  return value;
}

function id(value) {
  if (!/^\d+$/.test(value) || value === "0") {
    throw validationError("Invalid application ID.");
  }
  return value;
}

function newApplication(input = {}) {
  return {
    company_name: requiredText(input.company_name, "Company name", 150),
    job_title: requiredText(input.job_title, "Job title", 150),
    job_url: optionalText(input.job_url, "Job URL", 2048),
    source: optionalText(input.source, "Source", 100),
    status: status(input.status),
    applied_at: input.applied_at || null,
    notes: optionalText(input.notes, "Notes", 10000),
  };
}

function updatedApplication(current, input = {}) {
  const has = (field) => Object.hasOwn(input, field);
  return {
    company_name: has("company_name")
      ? requiredText(input.company_name, "Company name", 150)
      : current.company_name,
    job_title: has("job_title")
      ? requiredText(input.job_title, "Job title", 150)
      : current.job_title,
    job_url: has("job_url")
      ? optionalText(input.job_url, "Job URL", 2048)
      : current.job_url,
    source: has("source")
      ? optionalText(input.source, "Source", 100)
      : current.source,
    status: has("status") ? status(input.status) : current.status,
    applied_at: has("applied_at") ? input.applied_at || null : current.applied_at,
    notes: has("notes")
      ? optionalText(input.notes, "Notes", 10000)
      : current.notes,
  };
}

export function createApplicationsService(repository) {
  return {
    list: () => repository.findAll(),

    async get(applicationId) {
      const application = await repository.findById(id(applicationId));
      if (!application) throw notFoundError();
      return application;
    },

    create: (input) => repository.insert(newApplication(input)),

    async update(applicationId, input) {
      const normalizedId = id(applicationId);
      const current = await repository.findById(normalizedId);
      if (!current) throw notFoundError();
      return repository.update(normalizedId, updatedApplication(current, input));
    },

    async remove(applicationId) {
      if (!(await repository.remove(id(applicationId)))) throw notFoundError();
    },
  };
}
