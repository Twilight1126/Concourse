function ComingSoonPage({ title, description }) {
  return (
    <div className="app-shell">
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>
      <section className="coming-soon-panel">
        <span>Coming next</span>
        <p>This workspace will be enabled in the next feature step.</p>
      </section>
    </div>
  );
}

export default ComingSoonPage;
