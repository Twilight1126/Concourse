# Concourse Capture privacy policy

Effective date: 9 October 2026

Concourse Capture is a Microsoft Edge extension for reviewing job opportunities and saving application and outreach records to a user's Concourse workspace. For privacy questions or requests, contact **chiragbsanil07@gmail.com**.

## Information the extension handles

- **Account and sign-in:** The extension uses Google sign-in through Supabase Auth to connect to the user's Concourse account. It receives and stores session tokens and an account identifier in the browser. It does not receive the user's Google password.
- **Jobs and applications:** On job or application pages, the extension reads relevant page content to suggest details such as employer, job title, job location, salary range, experience requirements, resume filename, and the job-page URL. The user can review and edit these details before saving them. The extension may also use the expected salary saved in the user's Concourse profile when creating an application record.
- **Outreach:** On Gmail, the extension offers a review panel for saving outreach metadata: sender and recipient addresses, contact and company names, subject, attachment filename, outreach type, and draft or sent status. It does not save email message bodies or attachment contents. A user may also select a LinkedIn contact to carry that person's name, title, and profile URL into the outreach form.
- **Browser-local information:** The extension stores its workspace connection, sign-in session, theme preference, and pending contact details in browser storage. It temporarily keeps job-review drafts in browser session storage so a user can finish an application flow.

The extension does not collect a general browsing-history log, device location, health information, payment-card details, or keystrokes. It reads supported pages to provide the review features; it sends a job or outreach record to Concourse when the user chooses to save it.

## How information is used and shared

The information above is used to sign the user in, show review cards, save application records and outreach metadata, and operate the Concourse service. Production records are sent over HTTPS to the Concourse service hosted on Cloudflare and stored using Supabase. Supabase also provides authentication; Google is used for the sign-in flow. These services process information needed to provide Concourse. The extension also supports a local-development workspace on the user's own computer.

Concourse does not sell user data, use it for advertising, share it for unrelated purposes, or use it to assess creditworthiness or lending eligibility. It does not send email bodies or attachment contents to Concourse.

## User choices and retention

Users choose whether to save a reviewed job or outreach record. They can view, edit, or delete saved application records in their Concourse workspace. The outreach workspace is still being developed; users can request access to or deletion of saved outreach records using the contact address below. Users can stop the extension from accessing pages by disabling or uninstalling it in Microsoft Edge. Uninstalling the extension removes its browser-local extension storage but does not automatically delete records already saved to Concourse.

Saved records remain in Concourse until the user deletes them or requests account-data deletion. For help accessing or deleting account data, email **chiragbsanil07@gmail.com**. Service providers may retain limited operational logs or backups according to their own retention practices.

## Changes

This policy will be updated if the extension's data practices change. The current version will remain available at this URL.
