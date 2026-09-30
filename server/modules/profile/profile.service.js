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

  const result = value.trim();

  if (result.length > maxLength) {
    throw validationError(`${label} is too long.`);
  }

  return result;
}

function optionalText(value, label, maxLength) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value !== "string") {
    throw validationError(`${label} must be text.`);
  }

  const result = value.trim();

  if (result.length > maxLength) {
    throw validationError(`${label} is too long.`);
  }

  return result || null;
}

function optionalUrl(value, label) {
  const result = optionalText(value, label, 2048);

  if (!result) return null;

  try {
    const url = new URL(result);

    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch {
    throw validationError(`${label} must be a valid web address.`);
  }

  return result;
}

function optionalNumber(value, label, minimum, maximum) {
  if (value === null || value === undefined || value === "") return null;

  const result = Number(value);

  if (!Number.isFinite(result) || result < minimum || result > maximum) {
    throw validationError(`${label} must be between ${minimum} and ${maximum}.`);
  }

  return result;
}

function timezone(value) {
  const result = requiredText(value, "Timezone", 100);

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: result }).format();
  } catch {
    throw validationError("Timezone must be a valid IANA timezone.");
  }

  return result;
}

function profile(input = {}, identity = {}) {
  if (!identity.email || !identity.emailVerified) {
    throw validationError("A verified Google email is required.");
  }

  return {
    display_name: requiredText(input.display_name, "Display name", 100),
    avatar_url: optionalUrl(identity.avatarUrl, "Avatar URL"),
    email: requiredText(identity.email, "Email", 320).toLowerCase(),
    phone: optionalText(input.phone, "Phone", 30),
    location: optionalText(input.location, "Location", 150),
    timezone: timezone(input.timezone),
    present_company: optionalText(input.present_company, "Present company", 150),
    current_job_title: optionalText(input.current_job_title, "Current job title", 150),
    years_of_experience: optionalNumber(input.years_of_experience, "Years of experience", 0, 80),
    skills: optionalText(input.skills, "Skills", 2000),
    preferred_roles: requiredText(input.preferred_roles, "Preferred roles", 500),
    current_ctc: optionalNumber(input.current_ctc, "Current CTC", 0, 9999999999),
    expected_ctc: optionalNumber(input.expected_ctc, "Expected CTC", 0, 9999999999),
    currency: optionalText(input.currency, "Currency", 3)?.toUpperCase() ?? null,
    notice_period_days: optionalNumber(input.notice_period_days, "Notice period", 0, 730),
    portfolio_url: optionalUrl(input.portfolio_url, "Portfolio URL"),
    linkedin_url: optionalUrl(input.linkedin_url, "LinkedIn URL"),
  };
}

export function createProfileService(repository) {
  return {
    get: (identity) => repository.find(identity),

    save: (input, identity) => repository.upsert(profile(input, identity), identity),
  };
}
