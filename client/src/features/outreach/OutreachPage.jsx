import { PaperPlaneTilt } from "@phosphor-icons/react";
import "./OutreachPage.css";

export default function OutreachPage() {
  return (
    <div className="app-shell outreach-page">
      <header className="page-header">
        <div><h1>Outreach</h1><p>Tools for managing job-search conversations are coming soon.</p></div>
      </header>
      <section className="applications-panel outreach-coming-soon" aria-labelledby="outreach-preview-heading">
        <div className="outreach-coming-soon__content">
          <span className="outreach-coming-soon__mark"><PaperPlaneTilt size={30} weight="duotone" aria-hidden="true" /></span>
          <h2 id="outreach-preview-heading">Outreach is coming soon.</h2>
          <p>You can keep tracking applications while we finish this workspace.</p>
        </div>
      </section>
    </div>
  );
}
