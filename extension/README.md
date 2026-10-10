# Concourse Capture extension

The public [privacy policy](https://concourse.chiragb0707.workers.dev/privacy.html) is maintained in `client/public/privacy.html`.

## Developer setup

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose this `extension` directory.
4. Pin **Concourse Capture**.
5. Refresh any job or Gmail tabs that were already open when the extension was loaded.
   The popup's Light mode / Dark mode button also updates the job and Gmail cards; the X closes only the popup.
6. Start the local API and web app, sign in to local Concourse, then open the extension and select **Connect to Concourse**. It detects Local when the local app or API is running. If neither is running, it selects Production.
7. On the job-description page, check and correct the card, then save once. The details lock and the card becomes a small Concourse icon. Drag the card header if it covers the job site. Apply on the job site. Concourse marks Applied when it recognizes confirmation; otherwise open the icon and select **I applied — mark Applied** after submitting.
   After Applied, the tracker link uses a visible application-status link when the site provides one, or the application page reached at that point.
8. Gmail compose windows receive the same metadata-only review card after Send.

## Regular users

Regular users should install the signed extension from the Chrome Web Store or Microsoft Edge Add-ons; they do not use Developer mode or Load unpacked. After installation they pin Concourse, sign in on the production website, open the extension, and connect once. Store updates install automatically.

Concourse opens its review card when it recognizes a job description. Other pages stay quiet. A site with unusual markup may need manual review.
If no review card appears on a **specific job description or application page**, use **No review card? Open it here** in the extension popup. This is the fallback for sites Concourse cannot recognize automatically, not for a feed or search results. Correct the company and job title before saving. Save on the job description before a long application; Concourse keeps those reviewed details while you move through the application and lets you mark Applied after submitting if the site provides no recognizable confirmation.

Local captures use the signed-in local web tab's access token and post only to the local API. The extension does not copy that tab's refresh token; keep the local Concourse tab open while capturing. Production uses a separate Supabase session created through Chrome Identity. Add the extension callback shown by `chrome.identity.getRedirectURL("supabase-auth")` to the Supabase authentication redirect allow list before connecting Production. The extension rejects a local web app configured with a remote API, or a production app configured with another API origin.

After connection, the local Concourse tab must stay open while capturing so the extension can use its current session. Production changes reach every signed-in tracker through Supabase Realtime; local tracker tabs receive the Express server's event stream without polling. Web session lifetime is managed by Supabase Auth. Email message bodies are never read or stored.
