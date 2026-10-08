(function initializeConcourseGmailCapture() {
  const PANEL_ATTRIBUTE = "data-concourse-panel";
  function accountEmail() {
    const candidates = [
      ...document.querySelectorAll('[aria-label^="Google Account:"]'),
      ...document.querySelectorAll('[aria-label*="@"], [data-email]'),
    ];
    for (const element of candidates) {
      const value = element.getAttribute("data-email") || element.getAttribute("aria-label") || "";
      const match = value.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
      if (match) return match[0];
    }
    return "";
  }

  function composeMetadata(compose, pendingContact) {
    const recipientElements = [...compose.querySelectorAll('[email], [data-hovercard-id*="@"]')];
    const contactEmail = recipientElements
      .map((element) => element.getAttribute("email") || element.getAttribute("data-hovercard-id"))
      .find(Boolean) || compose.querySelector('input[name="to"]')?.value || "";
    const subject = compose.querySelector('input[name="subjectbox"]')?.value || "";
    const attachmentNames = [...compose.querySelectorAll('[download_url], [data-tooltip*="Remove attachment"], [aria-label*="Attachment"]')]
      .map((element) => element.getAttribute("aria-label") || element.getAttribute("data-tooltip") || element.textContent)
      .map((value) => value?.replace(/^Remove attachment\s*/i, "").trim())
      .filter(Boolean);

    return {
      ...pendingContact,
      contact_email: contactEmail,
      sender_email: accountEmail(),
      subject,
      resume_filename: attachmentNames.find((name) => /resume|cv/i.test(name)) || attachmentNames[0] || "",
      source: "Gmail",
      status: "draft",
    };
  }

  async function saveOutreach(compose, panel, sent = false) {
    const settings = await chrome.storage.local.get({
      pendingContact: {},
    });
    const data = composeMetadata(compose, settings.pendingContact);
    data.contact_name = panel.querySelector('[name="contact_name"]').value.trim() || data.contact_name;
    data.company_name = panel.querySelector('[name="company_name"]').value.trim() || data.company_name;
    data.contact_email = panel.querySelector('[name="contact_email"]').value.trim() || data.contact_email;
    data.sender_email = panel.querySelector('[name="sender_email"]').value.trim() || data.sender_email;
    data.subject = panel.querySelector('[name="subject"]').value.trim() || data.subject;
    data.resume_filename = panel.querySelector('[name="resume_filename"]').value.trim() || data.resume_filename;
    data.outreach_type = panel.querySelector('[name="outreach_type"]').value;
    data.status = sent ? "sent" : "draft";
    if (sent) data.sent_at = new Date().toISOString();
    const output = panel.querySelector("output");
    if (!data.company_name || !data.contact_email || !data.sender_email || !data.subject) {
      output.textContent = "Add the company, recipient, sender, and subject before saving.";
      output.className = "is-error";
      return;
    }
    output.textContent = "Saving…";
    output.className = "";
    chrome.runtime.sendMessage({ type: "SAVE_CAPTURE", capture: { type: "outreach", data } });
  }

  function syncPanel(compose, panel) {
    const data = composeMetadata(compose, {});
    for (const name of ["contact_email", "sender_email", "subject", "resume_filename"]) {
      const field = panel.querySelector(`[name="${name}"]`);
      if (data[name]) field.value = data[name];
    }
  }

  async function addPanel(compose) {
    if (compose.querySelector(`[${PANEL_ATTRIBUTE}]`)) return;
    const { pendingContact = {}, concourseTheme } = await chrome.storage.local.get({ pendingContact: {}, concourseTheme: null });
    const panel = document.createElement("section");
    panel.setAttribute(PANEL_ATTRIBUTE, "");
    panel.dataset.concourseTheme = concourseTheme === "dark" || concourseTheme === "light"
      ? concourseTheme : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    panel.innerHTML = `
      <button class="concourse-panel__toggle" type="button" aria-expanded="false">
        <img class="concourse-panel__logo" src="${chrome.runtime.getURL("icons/brand-mark.svg")}" alt="" width="28" height="28"><strong>Track outreach</strong><small>Metadata only</small>
      </button>
      <div class="concourse-panel__body" hidden>
        <p>Review once after sending. Message content is never captured.</p>
        <label>Contact name<input name="contact_name" placeholder="Copy and paste if missing"></label>
        <label>Company<input name="company_name"></label>
        <label>Recipient<input name="contact_email" type="email"></label>
        <label>Sending email<input name="sender_email" type="email"></label>
        <label>Subject<input name="subject"></label>
        <label>Resume filename<input name="resume_filename"></label>
        <label>Outreach type<select name="outreach_type"><option>Referral request</option><option>Cold outreach</option><option>Recruiter follow-up</option><option>Networking</option></select></label>
        <button class="concourse-panel__review" type="button">Save outreach</button>
        <output></output>
      </div>`;
    compose.append(panel);
    panel.querySelector('[name="company_name"]').value = pendingContact.company_name || "";
    panel.querySelector('[name="contact_name"]').value = pendingContact.contact_name || "";
    panel.querySelector('[name="sender_email"]').value = accountEmail();
    syncPanel(compose, panel);

    const toggle = panel.querySelector(".concourse-panel__toggle");
    const body = panel.querySelector(".concourse-panel__body");
    toggle.addEventListener("click", () => {
      syncPanel(compose, panel);
      body.hidden = !body.hidden;
      toggle.setAttribute("aria-expanded", String(!body.hidden));
    });
    panel.querySelector(".concourse-panel__review").addEventListener("click", () => saveOutreach(compose, panel, panel.dataset.sent === "true"));
  }

  function scan() {
    document.querySelectorAll('[role="dialog"]').forEach((dialog) => {
      if (dialog.querySelector('input[name="subjectbox"]')) void addPanel(dialog);
    });
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
  scan();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.concourseTheme) return;
    const theme = changes.concourseTheme.newValue;
    for (const panel of document.querySelectorAll(`[${PANEL_ATTRIBUTE}]`)) panel.dataset.concourseTheme = theme;
  });

  document.addEventListener("click", (event) => {
    const sendButton = event.target.closest('[role="button"], button');
    const label = `${sendButton?.getAttribute("aria-label") || ""} ${sendButton?.getAttribute("data-tooltip") || ""} ${sendButton?.textContent || ""}`;
    if (!sendButton || !/^\s*send\b/i.test(label)) return;
    const compose = sendButton.closest('[role="dialog"]');
    if (!compose?.querySelector('input[name="subjectbox"]')) return;
    const panel = compose.querySelector(`[${PANEL_ATTRIBUTE}]`);
    if (!panel) return;
    syncPanel(compose, panel);
    document.body.append(panel);
    panel.dataset.sent = "true";
    panel.querySelector(".concourse-panel__body").hidden = false;
    panel.querySelector(".concourse-panel__toggle").setAttribute("aria-expanded", "true");
    panel.querySelector(".concourse-panel__review").textContent = "Save sent outreach";
  }, true);

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== "CAPTURE_RESULT") return;
    const panels = [...document.querySelectorAll(`[${PANEL_ATTRIBUTE}]`)];
    const panel = panels.at(-1);
    const output = panel?.querySelector("output");
    if (!output) return;
    output.textContent = message.ok ? "Saved. Continue your outreach." : message.error || "Could not save this outreach.";
    output.className = message.ok ? "is-success" : "is-error";
  });
})();
