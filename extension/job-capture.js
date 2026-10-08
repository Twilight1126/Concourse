(function mountConcourseJobCapture() {
  const ROOT_ID = "concourse-job-capture";
  const CONFIRMATION = /you (?:have )?successfully applied|(?:your )?application (?:has |was |is )?(?:successfully )?(?:been )?(?:submitted|sent|received|complete)|thank(?:s| you) for applying/i;
  const fields = [
    ["Company", "company_name"],
    ["Job title", "job_title"],
    ["Location", "location"],
    ["Experience required", "experience_required"],
    ["Resume / CV used", "resume_filename"],
    ["Company salary budget", "salary_budget"],
  ];

  let currentCapture = null;
  let currentIdentity = "";
  let scanTimer;
  let scanVersion = 0;
  let rememberTimer;
  let observer;
  let markingApplied = false;
  let trackedIdentity = "";
  let manualReview = false;
  let manualReviewUrl = "";
  let cardPosition = null;
  let cardTheme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const editedFields = new Set();

  const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const escapeHtml = (value) => String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  function identity(capture) {
    const data = capture?.data || {};
    return [data.source, data.job_url || `${data.company_name}|${data.job_title}`]
      .map((value) => clean(value).toLowerCase())
      .join("|");
  }

  function applicationLink(original) {
    try {
      const started = new URL(original);
      const current = new URL(location.href);
      const statusLink = [...document.querySelectorAll("a[href]")].find((link) =>
        link.getClientRects().length
        && /^(?:view|track|check|go to) (?:my |your |the )?(?:application(?:s)?(?: status)?|application dashboard)$|^my applications$/i.test(clean(link.textContent)));
      if (statusLink) {
        const destination = new URL(statusLink.href, current.href);
        if (["http:", "https:"].includes(destination.protocol)) return destination.href;
      }
      const applicationPage = /apply|application|applicant|candidate|thank|confirm|summary|status/i.test(current.pathname)
        || /^(success|submitted|complete)$/i.test(current.searchParams.get("result") || current.searchParams.get("status") || "");
      return current.href !== started.href && (current.origin !== started.origin || applicationPage)
        ? current.href : original;
    } catch { return original; }
  }

  function teardown() {
    observer?.disconnect();
    window.clearTimeout(scanTimer);
    window.clearTimeout(rememberTimer);
    document.getElementById(ROOT_ID)?.remove();
  }

  function extensionAvailable() {
    try {
      return Boolean(chrome.runtime?.id);
    } catch {
      teardown();
      return false;
    }
  }

  function sendMessage(message, timeoutMs = 15_000) {
    if (!extensionAvailable()) return Promise.reject(new Error("Reload this job tab after updating the extension."));
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error("Concourse did not respond. Check the selected workspace and try again.")),
        timeoutMs,
      );
      chrome.runtime.sendMessage(message).then(resolve, reject).finally(() => window.clearTimeout(timeout));
    }).catch((error) => {
      if (/context invalidated/i.test(error?.message || "")) teardown();
      throw error;
    });
  }

  function inputValues(root) {
    const data = { ...(currentCapture?.data || {}) };
    for (const input of root.querySelectorAll("input[name]")) data[input.name] = input.value.trim();
    return { ...data, status: data.status || "saved" };
  }

  function storeDraft(capture) {
    return sendMessage({
      type: "REMEMBER_JOB_CAPTURE",
      capture,
      editedFields: [...editedFields],
      pageUrl: location.href,
    }).catch(() => {});
  }

  function rememberDraft(root, immediate = false) {
    currentCapture = { ...currentCapture, type: "application", data: inputValues(root) };
    window.clearTimeout(rememberTimer);
    if (immediate) return storeDraft(currentCapture);
    rememberTimer = window.setTimeout(() => void storeDraft(currentCapture), 150);
    return Promise.resolve();
  }

  function setExpanded(root, expanded) {
    root.classList.toggle("is-expanded", expanded);
    root.querySelector(".concourse-job-card__body").hidden = !expanded;
    if (cardPosition) positionCard(root, cardPosition.left, cardPosition.top);
    const toggle = root.querySelector(".concourse-job-card__toggle");
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.setAttribute("aria-label", expanded ? "Collapse application review" : "Open captured application");
  }

  function positionCard(root, left, top) {
    const viewport = window.visualViewport;
    const minLeft = viewport?.offsetLeft || 0;
    const minTop = viewport?.offsetTop || 0;
    const width = viewport?.width || innerWidth;
    const height = viewport?.height || innerHeight;
    const nextLeft = Math.max(minLeft, Math.min(left, minLeft + width - root.offsetWidth));
    const nextTop = Math.max(minTop, Math.min(top, minTop + height - root.offsetHeight));
    Object.assign(root.style, {
      left: `${nextLeft}px`,
      top: `${nextTop}px`,
      right: "auto",
      bottom: "auto",
    });
    cardPosition = { left: nextLeft, top: nextTop };
  }

  function showMessage(root, message, type = "") {
    const output = root.querySelector("output");
    output.textContent = message;
    output.className = type ? `is-${type}` : "";
  }

  function syncDetectedValues(root, capture) {
    if (currentCapture?.data.record_id) return;
    for (const [name, value] of Object.entries(capture.data || {})) {
      const input = root.querySelector(`input[name="${CSS.escape(name)}"]`);
      if (input && !editedFields.has(name) && clean(value)) input.value = value;
    }
    currentCapture = { ...currentCapture, type: "application", data: inputValues(root) };
  }

  async function save(root) {
    const button = root.querySelector(".concourse-job-card__save");
    if (button.disabled) return;
    button.disabled = true;
    button.textContent = "Saving…";
    showMessage(root, "");

    try {
      await rememberDraft(root, true);
      if (!currentCapture.data.company_name.trim() || !currentCapture.data.job_title.trim()) {
        throw new Error("Add the company and job title before saving.");
      }
      currentCapture.data.status = "saved";
      currentCapture.data.applied_at = null;
      const result = await sendMessage({ type: "SAVE_CAPTURE", capture: currentCapture, status: "saved" });
      if (!result?.ok) throw new Error(result?.error || "Could not save this application.");
      currentCapture.data = {
        ...currentCapture.data,
        ...result.record,
        record_id: result.record.id,
        status: result.record.status || "saved",
      };
      await storeDraft(currentCapture);
      root.classList.add("is-captured");
      root.querySelector(".concourse-job-card__toggle strong").textContent = "Captured by Concourse";
      root.querySelector(".concourse-job-card__toggle small").textContent = "Details locked";
      for (const input of root.querySelectorAll("input[name]")) input.disabled = true;
      button.disabled = false;
      button.type = "button";
      button.textContent = "I applied — mark Applied";
      showMessage(root, "Details saved. Apply on this site. If Concourse misses confirmation, mark Applied here afterward.", "success");
      window.setTimeout(() => setExpanded(root, false), 700);
    } catch (error) {
      if (!document.contains(root)) return;
      button.disabled = false;
      button.textContent = "Try again";
      showMessage(root, error.message || "Could not save this application.", "error");
    }
  }

  async function markApplied(root, clearAfterConfirmation = false) {
    if (!root) return;
    if (markingApplied || currentCapture?.data.status === "applied") return;
    if (!currentCapture?.data.record_id) {
      setExpanded(root, true);
      showMessage(root, "Save the reviewed details to track this application.", "error");
      return;
    }

    markingApplied = true;
    const appliedCapture = {
      ...currentCapture,
      data: {
        ...currentCapture.data,
        status: "applied",
        applied_at: new Date().toISOString(),
        job_url: applicationLink(currentCapture.data.job_url),
      },
    };
    try {
      const result = await sendMessage({ type: "MARK_CAPTURE_APPLIED", capture: appliedCapture });
      if (!result?.ok) throw new Error(result?.error || "Could not update the application status.");
      currentCapture.data = { ...appliedCapture.data, ...result.record, record_id: result.record.id };
      root.classList.add("is-captured");
      root.querySelector(".concourse-job-card__toggle strong").textContent = "Captured by Concourse";
      root.querySelector(".concourse-job-card__toggle small").textContent = clearAfterConfirmation ? "Application confirmed" : "Details locked";
      const button = root.querySelector(".concourse-job-card__save");
      button.disabled = true;
      button.textContent = "Applied";
      showMessage(root, clearAfterConfirmation
        ? "Application confirmed. Ready for the next job."
        : "Your data has been captured by Concourse. Finish the application normally.", "success");
      if (clearAfterConfirmation) {
        trackedIdentity = identity(currentCapture);
        await sendMessage({ type: "CLEAR_JOB_CAPTURE" }).catch(() => {});
        window.setTimeout(() => root.remove(), 900);
      } else {
        window.setTimeout(() => setExpanded(root, false), 700);
      }
    } catch (error) {
      setExpanded(root, true);
      showMessage(root, error.message || "Could not update the application status.", "error");
    } finally {
      markingApplied = false;
    }
  }

  function render(capture) {
    document.getElementById(ROOT_ID)?.remove();
    currentCapture = {
      ...capture,
      data: { ...capture.data, status: capture.data.status || "saved" },
    };
    currentIdentity = identity(capture);
    const alreadySaved = Boolean(capture.data.record_id);
    const applied = capture.data.status === "applied";
    const root = document.createElement("aside");
    root.id = ROOT_ID;
    root.className = alreadySaved ? "is-captured" : "is-expanded";
    root.dataset.concourseTheme = cardTheme;
    root.setAttribute("aria-label", "Concourse application review");
    root.innerHTML = `
      <button class="concourse-job-card__toggle" type="button" aria-expanded="${String(!alreadySaved)}" aria-label="${alreadySaved ? "Open captured application" : "Collapse application review"}" title="Drag to move; click to ${alreadySaved ? "open" : "collapse"}">
        <img class="concourse-job-card__logo" src="${chrome.runtime.getURL("icons/brand-mark.svg")}" alt="" width="30" height="30">
        <div><strong>${alreadySaved ? "Captured by Concourse" : "Review before applying"}</strong><small>${escapeHtml(applied ? "Application confirmed" : alreadySaved ? "Details locked" : capture.data.company_name || capture.data.source || location.hostname)}</small></div>
        <span class="concourse-job-card__move" aria-hidden="true">Drag</span><b aria-hidden="true">⌄</b>
      </button>
      <form class="concourse-job-card__body"${alreadySaved ? " hidden" : ""}>
        <p>Check the details, save them, then apply on this site.</p>
        <div class="concourse-job-card__fields">
          ${fields.map(([label, name]) => `<label>${label}<input name="${name}" value="${escapeHtml(capture.data[name])}"${alreadySaved ? " disabled" : ""}></label>`).join("")}
        </div>
        <div class="concourse-job-card__actions">
          <button class="concourse-job-card__save" type="${alreadySaved ? "button" : "submit"}"${applied && alreadySaved ? " disabled" : ""}>${applied ? "Applied" : alreadySaved ? "I applied — mark Applied" : "Save details"}</button>
        </div>
        <output class="${alreadySaved ? "is-success" : ""}" aria-live="polite">${alreadySaved ? applied ? "Application confirmed." : "Details saved. Apply on this site. If Concourse misses confirmation, mark Applied here afterward." : ""}</output>
      </form>`;
    document.documentElement.append(root);
    if (cardPosition) positionCard(root, cardPosition.left, cardPosition.top);

    const toggle = root.querySelector(".concourse-job-card__toggle");
    let drag = null;
    let suppressClick = false;
    toggle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const rect = root.getBoundingClientRect();
      drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
      toggle.setPointerCapture(event.pointerId);
    });
    toggle.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      event.preventDefault();
      toggle.classList.add("is-dragging");
      positionCard(root, drag.left + dx, drag.top + dy);
    });
    toggle.addEventListener("pointerup", () => {
      suppressClick = Boolean(drag?.moved);
      if (suppressClick) window.setTimeout(() => { suppressClick = false; }, 0);
      drag = null;
      toggle.classList.remove("is-dragging");
    });
    toggle.addEventListener("pointercancel", () => {
      drag = null;
      toggle.classList.remove("is-dragging");
    });
    toggle.addEventListener("click", () => {
      if (suppressClick) { suppressClick = false; return; }
      setExpanded(root, root.querySelector(".concourse-job-card__body").hidden);
    });
    root.querySelector(".concourse-job-card__fields").addEventListener("input", (event) => {
      if (!event.target.name || currentCapture?.data.record_id) return;
      editedFields.add(event.target.name);
      const button = root.querySelector(".concourse-job-card__save");
      button.disabled = false;
      button.textContent = "Save details";
      rememberDraft(root);
    });
    root.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      void save(root);
    });
    root.querySelector(".concourse-job-card__save").addEventListener("click", () => {
      if (currentCapture?.data.record_id && currentCapture.data.status !== "applied") void markApplied(root, true);
    });
  }

  function submissionConfirmed() {
    const text = [...document.querySelectorAll("h1, h2, h3, p, [role='alert'], [role='status'], [role='dialog']")]
      .filter((element) => element.getClientRects().length)
      .map((element) => element.innerText || "")
      .join(" ");
    const query = new URL(location.href).searchParams;
    const status = query.get("status") || query.get("result");
    const confirmedUrl = /thank-?you|application-(?:submitted|complete)|\/confirmation(?:\/|$)/i.test(location.pathname)
      || /^(?:success|submitted|complete)$/i.test(status || "");
    return confirmedUrl || CONFIRMATION.test(text);
  }

  async function pendingCapture() {
    const result = await sendMessage({ type: "GET_PENDING_JOB_CAPTURE", pageUrl: location.href, referrer: document.referrer });
    return result?.capture;
  }

  async function scan() {
    if (!extensionAvailable()) return;
    if (manualReview && location.href !== manualReviewUrl) manualReview = false;
    if (manualReview) {
      if (currentCapture?.data.record_id && submissionConfirmed()) {
        await markApplied(document.getElementById(ROOT_ID), true);
      }
      return;
    }
    const version = ++scanVersion;
    let detected = globalThis.ConcourseCapture?.captureCurrentPage();
    if (detected?.type !== "application") {
      try {
        const pending = await pendingCapture();
        if (version !== scanVersion) return;
        detected = pending;
      } catch { /* Keep the page usable while the extension restarts. */ }
      if (detected?.type !== "application") {
        document.getElementById(ROOT_ID)?.remove();
        currentCapture = null;
        currentIdentity = "";
        return;
      }
    }
    try {
      const enriched = await sendMessage({ type: "ENRICH_JOB_CAPTURE", capture: { ...detected, pageUrl: location.href } });
      if (version !== scanVersion) return;
      detected = enriched?.capture || detected;
    } catch {
      if (!extensionAvailable()) return;
    }

    if (detected.pageKind !== "description" && !detected.data.record_id) {
      try {
        detected = await pendingCapture() || detected;
        if (version !== scanVersion) return;
      } catch { /* The user can still review a detected job page. */ }
    }

    if (detected.pageKind !== "description" && !detected.data.record_id) {
      document.getElementById(ROOT_ID)?.remove();
      currentCapture = null;
      currentIdentity = "";
      return;
    }

    const confirmed = submissionConfirmed();
    if (identity(detected) === trackedIdentity) return;
    if (confirmed && detected.data.status === "applied") {
      trackedIdentity = identity(detected);
      await sendMessage({ type: "CLEAR_JOB_CAPTURE" }).catch(() => {});
      document.getElementById(ROOT_ID)?.remove();
      return;
    }
    if (confirmed && !detected.data.record_id) {
      document.getElementById(ROOT_ID)?.remove();
      return;
    }

    const root = document.getElementById(ROOT_ID);
    if (root?.contains(document.activeElement) && !confirmed) return;
    if (root && identity(detected) === currentIdentity) syncDetectedValues(root, detected);
    else {
      editedFields.clear();
      for (const name of detected.editedFields || []) editedFields.add(name);
      render(detected);
    }

    if (confirmed) await markApplied(document.getElementById(ROOT_ID), true);
  }

  if (!extensionAvailable()) return;
  chrome.storage.local.get("concourseTheme").then(({ concourseTheme }) => {
    if (concourseTheme !== "dark" && concourseTheme !== "light") return;
    cardTheme = concourseTheme;
    const root = document.getElementById(ROOT_ID);
    if (root) root.dataset.concourseTheme = cardTheme;
  }).catch(() => {});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.concourseTheme) return;
    cardTheme = changes.concourseTheme.newValue;
    const root = document.getElementById(ROOT_ID);
    if (root) root.dataset.concourseTheme = cardTheme;
  });
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "OPEN_JOB_REVIEW") {
      if (/^(?:www\.)?linkedin\.com$/.test(location.hostname) && !location.pathname.startsWith("/jobs/")) {
        sendResponse({ ok: false, error: "Open a specific LinkedIn job before reviewing it." });
        return;
      }
      manualReview = true;
      manualReviewUrl = location.href;
      const detected = globalThis.ConcourseCapture?.captureCurrentPage();
      pendingCapture()
        .then((pending) => pending || (detected?.type === "application" ? detected : {
          type: "application",
          pageKind: "description",
          data: {
            company_name: "",
            job_title: clean(document.querySelector("h1")?.textContent),
            job_url: location.href,
            source: location.hostname,
          },
        }))
        .then(async (capture) => {
          const enriched = await sendMessage({ type: "ENRICH_JOB_CAPTURE", capture });
          render(enriched?.capture || capture);
        })
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message.type !== "GET_CAPTURE") return;
    sendResponse(currentCapture || globalThis.ConcourseCapture?.captureCurrentPage() || { type: "unsupported" });
  });

  observer = new MutationObserver((changes) => {
    if (changes.every((change) => document.getElementById(ROOT_ID)?.contains(change.target))) return;
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(() => void scan(), 350);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", () => {
    const root = document.getElementById(ROOT_ID);
    if (root && cardPosition) positionCard(root, cardPosition.left, cardPosition.top);
  });
  void scan();
})();
