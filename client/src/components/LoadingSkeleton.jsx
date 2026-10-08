import "./LoadingSkeleton.css";

const blocks = (count, className) => Array.from({ length: count }, (_, index) => <span className={className} key={index} />);

export default function LoadingSkeleton({ type = "rows", label = "Loading content" }) {
  return <div className={`loading-skeleton loading-skeleton--${type}`} role="status" aria-label={label}>
    <span className="sr-only">{label}</span>
    <div aria-hidden="true">
      {type === "dashboard" && <>
        <div className="loading-skeleton__metrics">{blocks(4, "loading-skeleton__card")}</div>
        <div className="loading-skeleton__columns">{blocks(2, "loading-skeleton__panel")}</div>
        <span className="loading-skeleton__wide" />
        <span className="loading-skeleton__wide loading-skeleton__wide--short" />
      </>}
      {type === "admin" && <>
        <span className="loading-skeleton__heading" />
        <div className="loading-skeleton__metrics loading-skeleton__metrics--admin">{blocks(2, "loading-skeleton__card")}</div>
        <div className="loading-skeleton__columns">{blocks(2, "loading-skeleton__panel")}</div>
        <div className="loading-skeleton__columns">{blocks(2, "loading-skeleton__panel")}</div>
      </>}
      {type === "rows" && <><span className="loading-skeleton__table-head" />{blocks(3, "loading-skeleton__row")}</>}
      {type === "detail" && <><span className="loading-skeleton__heading" /><span className="loading-skeleton__wide loading-skeleton__wide--short" />{blocks(2, "loading-skeleton__row")}</>}
      {type === "profile" && <><span className="loading-skeleton__heading" /><span className="loading-skeleton__row" /><span className="loading-skeleton__wide" /></>}
      {type === "auth" && <><span className="loading-skeleton__heading" /><span className="loading-skeleton__row" /><span className="loading-skeleton__row loading-skeleton__row--short" /></>}
    </div>
  </div>;
}
