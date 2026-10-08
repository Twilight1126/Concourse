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
const UPDATE_STATUSES = new Set([...APPLICATION_STATUSES].filter((value) => value !== "saved"));

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

function optionalNumber(value, label) {
  if (value === null || value === undefined || value === "") return null;
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0) {
    throw validationError(`${label} must be a positive number.`);
  }
  return result;
}

function optionalDate(value, label) {
  if (!value) return null;
  const result = new Date(value);
  if (Number.isNaN(result.getTime())) throw validationError(`${label} is invalid.`);
  return result;
}

function requiredDate(value, label) {
  const result = optionalDate(value, label);
  if (!result) throw validationError(`${label} is required.`);
  return result;
}

function status(value = "saved") {
  if (typeof value !== "string" || !APPLICATION_STATUSES.has(value)) {
    throw validationError("Invalid application status.");
  }
  return value;
}

function id(value) {
  const normalized = String(value);
  if (!/^\d+$/.test(normalized) || normalized === "0") {
    throw validationError("Invalid application ID.");
  }
  return normalized;
}

function newApplication(input = {}) {
  const applicationStatus = status(input.status);
  return {
    company_name: requiredText(input.company_name, "Company name", 150),
    job_title: requiredText(input.job_title, "Job title", 150),
    job_url: optionalText(input.job_url, "Job URL", 2048),
    source: optionalText(input.source, "Source", 100),
    location: optionalText(input.location, "Location", 150),
    work_mode: optionalText(input.work_mode, "Work mode", 32),
    employment_type: optionalText(input.employment_type, "Employment type", 64),
    experience_required: optionalText(input.experience_required, "Experience", 100),
    experience_min: optionalNumber(input.experience_min, "Minimum experience"),
    experience_max: optionalNumber(input.experience_max, "Maximum experience"),
    salary_min: optionalNumber(input.salary_min, "Minimum salary"),
    salary_max: optionalNumber(input.salary_max, "Maximum salary"),
    salary_currency: optionalText(input.salary_currency, "Salary currency", 3)?.toUpperCase() ?? null,
    salary_period: optionalText(input.salary_period, "Salary period", 32),
    expected_salary: optionalNumber(input.expected_salary, "Expected salary"),
    salary_budget: optionalText(input.salary_budget, "Salary budget", 150),
    resume_filename: optionalText(input.resume_filename, "Resume filename", 255),
    interview_stage: optionalText(input.interview_stage, "Interview stage", 64),
    interview_at: optionalDate(input.interview_at, "Interview date"),
    rejection_reason: optionalText(input.rejection_reason, "Rejection reason", 500),
    status: applicationStatus,
    applied_at: optionalDate(input.applied_at, "Applied date") ?? (applicationStatus === "applied" ? new Date() : null),
    next_action: optionalText(input.next_action, "Next action", 255),
    follow_up_at: optionalDate(input.follow_up_at, "Follow-up date"),
    notes: optionalText(input.notes, "Notes", 10000),
  };
}

function updatedApplication(current, input = {}) {
  const has = (field) => Object.hasOwn(input, field);
  const nextStatus = has("status") ? status(input.status) : current.status;
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
    location: has("location") ? optionalText(input.location, "Location", 150) : current.location,
    work_mode: has("work_mode") ? optionalText(input.work_mode, "Work mode", 32) : current.work_mode,
    employment_type: has("employment_type") ? optionalText(input.employment_type, "Employment type", 64) : current.employment_type,
    experience_required: has("experience_required") ? optionalText(input.experience_required, "Experience", 100) : current.experience_required,
    experience_min: has("experience_min") ? optionalNumber(input.experience_min, "Minimum experience") : current.experience_min,
    experience_max: has("experience_max") ? optionalNumber(input.experience_max, "Maximum experience") : current.experience_max,
    salary_min: has("salary_min") ? optionalNumber(input.salary_min, "Minimum salary") : current.salary_min,
    salary_max: has("salary_max") ? optionalNumber(input.salary_max, "Maximum salary") : current.salary_max,
    salary_currency: has("salary_currency") ? optionalText(input.salary_currency, "Salary currency", 3)?.toUpperCase() ?? null : current.salary_currency,
    salary_period: has("salary_period") ? optionalText(input.salary_period, "Salary period", 32) : current.salary_period,
    expected_salary: has("expected_salary") ? optionalNumber(input.expected_salary, "Expected salary") : current.expected_salary,
    salary_budget: has("salary_budget") ? optionalText(input.salary_budget, "Salary budget", 150) : current.salary_budget,
    resume_filename: has("resume_filename") ? optionalText(input.resume_filename, "Resume filename", 255) : current.resume_filename,
    interview_stage: has("interview_stage") ? optionalText(input.interview_stage, "Interview stage", 64) : current.interview_stage,
    interview_at: has("interview_at") ? optionalDate(input.interview_at, "Interview date") : current.interview_at,
    rejection_reason: has("rejection_reason") ? optionalText(input.rejection_reason, "Rejection reason", 500) : current.rejection_reason,
    status: nextStatus,
    applied_at: has("applied_at")
      ? optionalDate(input.applied_at, "Applied date") ?? (nextStatus === "applied" && current.status !== "applied" ? new Date() : null)
      : nextStatus === "applied" && current.status !== "applied"
        ? new Date()
        : current.applied_at,
    next_action: has("next_action") ? optionalText(input.next_action, "Next action", 255) : current.next_action,
    follow_up_at: has("follow_up_at") ? optionalDate(input.follow_up_at, "Follow-up date") : current.follow_up_at,
    notes: has("notes")
      ? optionalText(input.notes, "Notes", 10000)
      : current.notes,
  };
}

export function createApplicationsService(repository) {
  return {
    list: () => repository.findAll(),

    page(options = {}) {
      return repository.findPage({
        page: Math.max(1, Math.min(100000, Number.parseInt(options.page, 10) || 1)),
        search: String(options.search ?? "").trim().slice(0, 100),
        status: APPLICATION_STATUSES.has(options.status) ? options.status : null,
        source: options.source === "all" ? null : String(options.source ?? "").trim().slice(0, 100) || null,
      });
    },

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

    async listUpdates(applicationId) {
      const normalizedId = id(applicationId);
      if (!(await repository.findById(normalizedId))) throw notFoundError();
      return repository.findUpdates(normalizedId);
    },

    async createUpdate(applicationId, input = {}) {
      const normalizedId = id(applicationId);
      const application = await repository.findById(normalizedId);
      if (!application) throw notFoundError();
      if (!UPDATE_STATUSES.has(application.status)) throw validationError("Mark this application as applied before adding an update.");
      return repository.insertUpdate({
        application_id: normalizedId,
        status: application.status,
        title: requiredText(input.title, "Update title", 150),
        happened_at: requiredDate(input.happened_at, "Update date"),
        details: optionalText(input.details, "Update details", 5000),
      });
    },

    async editUpdate(applicationId, updateId, input = {}) {
      const normalizedId = id(applicationId);
      if (!(await repository.findById(normalizedId))) throw notFoundError();
      const current = await repository.findUpdate(normalizedId, id(updateId));
      if (!current) throw notFoundError();
      return repository.updateUpdate(normalizedId, id(updateId), {
        title: requiredText(input.title, "Update title", 150),
        happened_at: requiredDate(input.happened_at, "Update date"),
        details: optionalText(input.details, "Update details", 5000),
      });
    },

    async removeUpdate(applicationId, updateId) {
      const normalizedId = id(applicationId);
      if (!(await repository.findById(normalizedId))) throw notFoundError();
      if (!(await repository.removeUpdate(normalizedId, id(updateId)))) throw notFoundError();
    },
  };
}
