export default function BrandMark({ className = "", showName = true }) {
  return <span className={`concourse-brand ${className}`} aria-label="Concourse">
    <img src="/brand-mark.svg" alt="" width="32" height="32" />
    {showName && <strong>Concourse</strong>}
  </span>;
}
