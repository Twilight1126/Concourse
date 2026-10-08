(function exposeConcoursePageCapture() {
  const GENERIC_TITLES = /^(?:job|job details?|job description|job application|careers?|apply|apply now|application|application form|skip to open roles|answer (?:these |the )?questions(?: from the employer)?|experience required|review (?:and )?apply)$/i;
  const GENERIC_COMPANIES = /^(?:apply|apply now|careers?|career site|job details?|job description|skip to open roles|open roles|view jobs?|search jobs?|home|menu|keka|darwinbox|greenhouse|lever|workday)$/i;
  const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const visible = (element) => Boolean(element?.getClientRects().length)
    && getComputedStyle(element).visibility !== "hidden"
    && getComputedStyle(element).display !== "none";

  function firstVisible(root, selectors) {
    for (const selector of selectors) {
      const element = [...root.querySelectorAll(selector)].find(visible);
      const value = clean(element?.textContent);
      if (value) return value;
    }
    return "";
  }

  function usefulLines(element = document.body) {
    return (element?.innerText || "").split("\n").map(clean).filter(Boolean);
  }

  function meta(name) {
    return clean(document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.content);
  }

  function validTitle(value) {
    const title = clean(value);
    return title && !GENERIC_TITLES.test(title) ? title : "";
  }

  function firstValidTitle(selectors) {
    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        if (!visible(element)) continue;
        const title = validTitle(element.textContent);
        if (title) return title;
      }
    }
    return "";
  }

  function hasApplyAction() {
    return [...document.querySelectorAll("button, a, [role='button'], input[type='submit']")]
      .some((element) => {
        if (!visible(element)) return false;
        const label = clean(`${element.textContent || element.value || ""} ${element.getAttribute("aria-label") || ""}`);
        return /^(?:easy apply|apply|apply now|apply for (?:this|the) (?:job|position)|apply to (?:this|the) (?:job|position))$/i.test(label);
      });
  }

  function validCompany(value) {
    const company = clean(value);
    return company.length > 1 && company.length <= 150 && !GENERIC_COMPANIES.test(company) ? company : "";
  }

  function validLocation(value) {
    const locationValue = clean(value);
    return /^(?:full[- ]?time|part[- ]?time|contract|permanent|hybrid|remote|on[- ]?site)$/i.test(locationValue)
      || /\b\d+(?:\.\d+)?\s*(?:-|–|—|to|\+)?\s*\d*(?:\.\d+)?\s*(?:years?|yrs?)\b/i.test(locationValue)
      || /(?:₹|Rs\.?|INR|US\$|USD|\$|EUR|€|GBP|£)\s*[\d,.]+/i.test(locationValue)
      ? ""
      : locationValue;
  }

  function jsonLdValues() {
    const values = [];
    function visit(value) {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) return value.forEach(visit);
      values.push(value);
      if (value["@graph"]) visit(value["@graph"]);
    }
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try { visit(JSON.parse(script.textContent)); } catch { /* Ignore invalid publisher markup. */ }
    }
    return values;
  }

  function jobPosting() {
    return jsonLdValues().find((value) => {
      const types = Array.isArray(value?.["@type"]) ? value["@type"] : [value?.["@type"]];
      return types.includes("JobPosting");
    });
  }

  function plainText(html) {
    const element = document.createElement("div");
    element.innerHTML = html || "";
    return clean(element.textContent);
  }

  function valueAfterLabel(labels, root = document) {
    const wanted = labels.map((label) => label.toLowerCase());
    for (const element of root.querySelectorAll("dt, th, label, strong, b, [class*='label'], [class*='title']")) {
      if (!visible(element) || !wanted.includes(clean(element.textContent).replace(/:$/, "").toLowerCase())) continue;
      const control = element.parentElement?.querySelector("input, select, textarea");
      const value = clean(element.nextElementSibling?.value)
        || clean(element.nextElementSibling?.textContent)
        || clean(control?.value)
        || clean(element.parentElement?.querySelector("dd, td, [class*='value']")?.textContent);
      if (value && !wanted.includes(value.toLowerCase())) return value;
    }
    const lines = usefulLines(root.body || root);
    const index = lines.findIndex((line) => wanted.includes(line.replace(/:$/, "").toLowerCase()));
    return index >= 0 ? lines[index + 1] || "" : "";
  }

  function experience(text) {
    const source = clean(text);
    return source.match(/\b\d+(?:\.\d+)?\s*(?:-|–|—|to)\s*\d+(?:\.\d+)?\+?\s*(?:years?|yrs?)\b/i)?.[0]
      || source.match(/\b(?:minimum|min\.?|at least)?\s*\d+(?:\.\d+)?\+?\s*(?:years?|yrs?)(?:\s+of\s+(?:relevant\s+)?experience)?\b/i)?.[0]
      || "";
  }

  const SALARY_PATTERNS = [
    /(?:₹|Rs\.?|INR|US\$|USD|\$|EUR|€|GBP|£)\s*[\d,.]+\s*(?:k|m|l|lakhs?|lacs?|crores?)?\s*(?:-|–|—|to)\s*(?:(?:₹|Rs\.?|INR|US\$|USD|\$|EUR|€|GBP|£)\s*)?[\d,.]+\s*(?:k|m|l|lakhs?|lacs?|crores?)?(?:\s*(?:\/|per)\s*(?:yr|year|annum|mo|month|hr|hour))?/i,
    /[\d,.]+\s*(?:k|m|l|lakhs?|lacs?|crores?)?\s*(?:INR|US\$|USD|EUR|GBP)\s*\/\s*(?:yr|year|annum|mo|month|hr|hour)\s*(?:-|–|—|to)\s*[\d,.]+\s*(?:k|m|l|lakhs?|lacs?|crores?)?\s*(?:INR|US\$|USD|EUR|GBP)\s*\/\s*(?:yr|year|annum|mo|month|hr|hour)/i,
    /[\d,.]+\s*(?:-|–|—|to)\s*[\d,.]+\s*(?:LPA|lakhs?|lacs?|crores?)(?:\s*(?:\/|per)\s*(?:yr|year|annum))?/i,
    /(?:₹|Rs\.?|INR|US\$|USD|\$|EUR|€|GBP|£)\s*[\d,.]+\s*(?:k|m|l|LPA|lakhs?|lacs?|crores?)(?:\s*(?:\/|per)\s*(?:yr|year|annum|mo|month|hr|hour))?/i,
  ];

  function salaryFromText(text) {
    const source = clean(text);
    return SALARY_PATTERNS.map((pattern) => source.match(pattern)?.[0]).find(Boolean) || "";
  }

  function visibleSalary(root = document) {
    const targeted = firstVisible(root, [
      "[data-testid*='salary']", "[class*='salary']", "[class*='compensation']", "[class*='pay-range']",
    ]);
    return salaryFromText(targeted);
  }

  function structuredSalary(posting) {
    const salary = posting?.baseSalary;
    if (!salary) return "";
    if (typeof salary === "string" || typeof salary === "number") return clean(salary);
    const value = salary.value;
    const amount = typeof value === "object"
      ? value.minValue && value.maxValue ? `${value.minValue}–${value.maxValue}` : value.value || value.minValue || value.maxValue
      : value;
    return [salary.currency, amount, value?.unitText].filter(Boolean).join(" ");
  }

  function resumeFilename() {
    const file = [...document.querySelectorAll('input[type="file"]')].find((input) => input.files?.[0])?.files?.[0]?.name;
    if (file) return file;
    return firstVisible(document, ["[class*='resume']", "[class*='attachment']", "[data-testid*='resume']"])
      .match(/[^\\/]+\.(?:pdf|docx?|rtf)\b/i)?.[0]?.trim() || "";
  }

  function formatLocation(locationValue) {
    const locations = Array.isArray(locationValue) ? locationValue : [locationValue];
    return locations.map((location) => {
      const address = location?.address || location;
      if (typeof address === "string") return clean(address);
      return [address?.addressLocality, address?.addressRegion, address?.addressCountry?.name || address?.addressCountry]
        .filter(Boolean).join(", ");
    }).filter(Boolean).join(" · ");
  }

  function titleContext(title) {
    const heading = [...document.querySelectorAll("h1, [role='heading'][aria-level='1']")]
      .find((element) => visible(element) && clean(element.textContent).includes(title));
    return usefulLines(heading?.parentElement?.parentElement || heading?.parentElement).slice(0, 12);
  }

  function genericCompany(title) {
    const direct = firstVisible(document, [
      "[data-testid*='company']", "[class*='company-name']", "[class*='companyName']",
      "[itemprop='hiringOrganization']", "a[href*='/company/']", "[class*='employer']",
    ]);
    if (validCompany(direct)) return validCompany(direct);
    const lines = titleContext(title);
    const titleIndex = lines.findIndex((line) => line.includes(title));
    const candidates = [...lines.slice(0, Math.max(0, titleIndex)), ...lines.slice(titleIndex + 1, titleIndex + 4)];
    return validCompany(candidates.find((line) => line.length <= 120 && !/posted|location|apply|full[- ]?time|part[- ]?time|permanent/i.test(line)));
  }

  function genericLocation(title) {
    const direct = firstVisible(document, [
      "[data-testid*='location']", "[class*='job-location']", "[class*='jobLocation']",
      "[itemprop='jobLocation']", "[class*='location']",
    ]) || valueAfterLabel(["location", "city", "preferred location"]);
    if (validLocation(direct)) return validLocation(direct);
    return validLocation(titleContext(title).find((line) => /,/.test(line) && !/posted|apply|qualification/i.test(line)));
  }

  function workMode(text) {
    return /\bhybrid\b/i.test(text) ? "Hybrid"
      : /\bremote\b/i.test(text) ? "Remote"
        : /\bon[- ]?site\b|\bin[- ]person\b/i.test(text) ? "On-site" : "";
  }

  function employmentType(value, text) {
    const structured = clean(Array.isArray(value) ? value[0] : value).replaceAll("_", " ");
    if (structured) return structured.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
    return /\bfull[- ]time\b/i.test(text) ? "Full-time"
      : /\bpart[- ]time\b/i.test(text) ? "Part-time"
        : /\bcontract(?:or)?\b/i.test(text) ? "Contract"
          : /\bintern(?:ship)?\b/i.test(text) ? "Internship" : "";
  }

  function linkedInJob(url) {
    const jobId = new URL(url).searchParams.get("currentJobId") || location.pathname.match(/\/jobs\/view\/(\d+)/)?.[1];
    const jobLinks = jobId ? [...document.querySelectorAll(`a[href*="/jobs/view/${CSS.escape(jobId)}"]`)].filter(visible) : [];
    const selectedLink = jobLinks.find((link) => link.closest("[aria-current='true'], .jobs-search-results__list-item--active")) || jobLinks[0];
    const selectedCard = selectedLink?.closest("li, [data-job-id], [data-occludable-job-id]")
      || document.querySelector(".jobs-search-results__list-item--active, [aria-current='true'][data-job-id]");
    const details = document.querySelector(".jobs-search__job-details--container, .jobs-details") || document.querySelector("main") || document.body;
    const cardLines = usefulLines(selectedCard);
    const linkTitle = clean(selectedLink?.textContent);
    const title = validTitle(firstVisible(details, [
      ".job-details-jobs-unified-top-card__job-title h1", ".job-details-jobs-unified-top-card__job-title",
      ".jobs-unified-top-card__job-title", ".jobs-details-top-card__job-title", "h1",
    ]) || linkTitle || cardLines[0]);
    const titleIndex = cardLines.findIndex((line) => line === title || line.includes(title));
    const company = firstVisible(details, [
      ".job-details-jobs-unified-top-card__company-name a", ".job-details-jobs-unified-top-card__company-name",
      ".jobs-unified-top-card__company-name a", ".jobs-unified-top-card__company-name",
      ".jobs-details-top-card__company-url", "a[href*='/company/']",
    ]) || (titleIndex >= 0 ? cardLines[titleIndex + 1] || "" : "");
    const primary = firstVisible(details, [
      ".job-details-jobs-unified-top-card__primary-description-container", ".jobs-unified-top-card__primary-description",
      ".jobs-details-top-card__bullet", "[class*='primary-description']",
    ]);
    const description = firstVisible(details, [".jobs-description-content__text", ".jobs-box__html-content", ".jobs-description"]);
    const context = [primary, selectedCard?.innerText, description].filter(Boolean).join(" ");
    const cardLocation = titleIndex >= 0 ? cardLines[titleIndex + 2] || "" : "";
    return {
      company_name: company,
      job_title: title,
      job_url: jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : url.split("#")[0],
      source: "LinkedIn",
      location: validLocation(cardLocation.replace(/\s*\((?:on-site|hybrid|remote)\)\s*$/i, ""))
        || validLocation(primary.split("·")[0]?.trim()),
      work_mode: workMode(context),
      employment_type: employmentType("", context),
      experience_required: experience(description || context),
      salary_budget: salaryFromText(context) || visibleSalary(details),
      resume_filename: resumeFilename(),
    };
  }

  function siteOverrides(host, title) {
    if (host.endsWith(".darwinbox.com") && /\/careers\/jobDetails\//i.test(location.pathname)) {
      const brand = clean(document.querySelector("header img[alt]")?.alt).replace(/\s*logo\b/i, "");
      return { company_name: validCompany(brand) || (host.startsWith("adaglobal.") ? "ADA" : ""), job_title: title, source: "Darwinbox" };
    }
    if (host === "careers.adobe.com") return { company_name: "Adobe", job_title: title, source: "Adobe Careers" };
    if (host.includes("google.com") && location.pathname.includes("/careers/")) {
      return { company_name: "Google", job_title: title, location: genericLocation(title), source: "Google Careers" };
    }
    if (host.includes("zohorecruit.")) {
      const brand = firstVisible(document, ["[class*='company']", "[class*='career'] img[alt]", "header img[alt]"]);
      return { company_name: clean(brand).replace(/\s*\|.*$/, ""), job_title: title, location: valueAfterLabel(["location", "city"]), source: "Zoho Recruit" };
    }
    if (host.includes("cutshort.io")) return { source: "Cutshort" };
    if (host.includes("greenhouse.io")) return { source: "Greenhouse" };
    if (host.includes("lever.co")) return { source: "Lever" };
    if (host.includes("myworkdayjobs.com")) return { source: "Workday" };
    return {};
  }

  function genericJob(url, host, posting) {
    const title = validTitle(posting?.title) || firstValidTitle([
      "[data-testid*='job-title']", "[class*='job-title']", "[class*='jobTitle']",
      "main h1", "article h1", "main h2", "article h2", "h1", "h2",
    ]) || validTitle(meta("og:title"));
    const description = plainText(posting?.description);
    const visibleDescription = firstVisible(document, [
      "#jobDescriptionText", "[data-testid*='job-description']", "[id*='job-description']", "[id*='jobDescription']", "[class*='job-description']",
      "[class*='jobDescription']", "[itemprop='description']",
    ]);
    const focusedContext = `${titleContext(title).join(" ")} ${description} ${visibleDescription}`;
    const pageContext = (document.body.innerText || "").slice(0, 50000);
    const overrides = siteOverrides(host, title);
    return {
      company_name: validCompany(posting?.hiringOrganization?.name) || validCompany(overrides.company_name)
        || validCompany(meta("og:site_name")) || genericCompany(title),
      job_title: overrides.job_title || title,
      job_url: posting?.url || document.querySelector('link[rel="canonical"]')?.href || url.split("#")[0],
      source: overrides.source || (host.includes("indeed") ? "Indeed" : host.includes("naukri") ? "Naukri" : host),
      location: validLocation(formatLocation(posting?.jobLocation)) || validLocation(overrides.location) || genericLocation(title),
      work_mode: workMode(focusedContext) || workMode(pageContext),
      employment_type: employmentType(posting?.employmentType, focusedContext || pageContext),
      experience_required: clean(typeof posting?.experienceRequirements === "string" ? posting.experienceRequirements : "")
        || experience(focusedContext)
        || experience(pageContext),
      salary_budget: salaryFromText(titleContext(title).join(" "))
        || visibleSalary()
        || salaryFromText(description)
        || structuredSalary(posting),
      resume_filename: resumeFilename(),
    };
  }

  function captureCurrentPage() {
    const url = location.href;
    const host = location.hostname.replace(/^www\./, "");
    if (host === "mail.google.com") return { type: "gmail" };
    if (host.includes("linkedin.com") && /\/in\//.test(location.pathname)) return { type: "contact", data: {
      contact_name: firstVisible(document, ["h1"]),
      contact_title: firstVisible(document, [".text-body-medium", "main section div.text-body-medium"]),
      company_name: "",
      linkedin_url: url.split("?")[0],
      contact_source: "LinkedIn",
    }};
    if (host.includes("linkedin.com") && /\/jobs\//.test(location.pathname)) {
      const data = linkedInJob(url);
      const applying = Boolean(document.querySelector(".jobs-easy-apply-modal, [data-test-modal-id='easy-apply-modal']"));
      return data.job_title && data.company_name
        ? { type: "application", data, pageKind: applying ? "step" : "description" }
        : { type: "unsupported" };
    }
    const posting = jobPosting();
    const isApplicationPage = /apply|application|questions|assessment|candidate/i.test(url);
    const description = firstVisible(document, [
      "#jobDescriptionText", "[data-testid*='job-description']", "[id*='job-description']", "[id*='jobDescription']", "[class*='job-description']",
      "[class*='jobDescription']", "[itemprop='description']",
    ]);
    const applyAction = hasApplyAction();
    const visibleJobContent = firstVisible(document, ["main", "article"])
      || (location.pathname.includes("jobDetails/") ? clean(document.body.innerText) : "");
    const jobDetailPath = /\/(?:jobs?|job-?details?|positions?|roles?|vacancies|opportunities)\/[^/?#]+|\/viewjob\b/i.test(location.pathname);
    const laterStep = /(?:[?&](?:step|stepname)=|\/(?:apply|review|questions|assessment|thankyou|confirmation)(?:\/|$))/i.test(url);
    if (!posting && !description && !applyAction && !isApplicationPage
      && !(jobDetailPath && visibleJobContent.length >= 300)) return { type: "unsupported" };
    const data = genericJob(url, host, posting);
    const isDescription = Boolean(data.job_title
      && (posting?.description || description || (jobDetailPath && visibleJobContent.length >= 300))
      && (posting || applyAction || jobDetailPath));
    if (isDescription && !laterStep) return { type: "application", data, pageKind: "description" };
    return isApplicationPage
      ? { type: "application", data, pageKind: "step" }
      : { type: "unsupported" };
  }

  globalThis.ConcourseCapture = { captureCurrentPage, resumeFilename };
})();
