import { useState } from "react";
import "./SourceBreakdown.css";

const colors = {
  LinkedIn: "#0f6e56", Indeed: "#477f9a", Monster: "#8b719a",
  Naukri: "#ae7c3d", Glassdoor: "#5c887c", Wellfound: "#ad6759",
  Instahyre: "#6d86aa", Cutshort: "#96764a", Hirist: "#537a96",
  Shine: "#9a6585", TimesJobs: "#75805a", Internshala: "#927150",
  ZipRecruiter: "#557f80", Dice: "#84739a",
  "Company portal": "#9b764d", Manual: "#757d85",
};
const fallbackColors = ["#497e8d", "#8a715a", "#876f92", "#6f8062", "#a26469"];
const colorFor = (name) => colors[name] || fallbackColors[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % fallbackColors.length];
const format = (value) => value.toLocaleString("en-IN");

export default function SourceBreakdown({ sources = [], compareSent = false, emptyMessage }) {
  const [activeSource, setActiveSource] = useState(null);
  if (!sources.length) return <p className="source-breakdown__empty">{emptyMessage}</p>;
  const rows = [...sources].sort((a, b) => compareSent
    ? Number(b.sent) - Number(a.sent) || Number(b.applications) - Number(a.applications) || a.name.localeCompare(b.name)
    : Number(b.applications) - Number(a.applications) || a.name.localeCompare(b.name));
  const tracked = rows.reduce((sum, source) => sum + (Number(source.applications) || 0), 0);
  const sent = rows.reduce((sum, source) => sum + (Number(source.sent) || 0), 0);
  const max = Math.max(...rows.map((source) => Number(source.applications) || 0), 1);
  const pieRows = rows.filter((source) => Number(source.sent) > 0);
  const highlighted = rows.find((source) => source.name === activeSource);
  const pieSegments = pieRows.reduce((segments, source) => {
    const size = 100 * Number(source.sent) / sent;
    const start = segments.at(-1)?.end ?? 0;
    return [...segments, { source, start, size, end: start + size }];
  }, []);
  const pieLabel = sent
    ? `Applications marked applied by source: ${pieRows.map((source) => `${source.name} ${format(Number(source.sent))}`).join(", ")}`
    : "No applications marked applied yet";

  if (compareSent) return <div className="source-breakdown source-breakdown--comparison">
    <div className="source-breakdown__comparison">
      <div className="source-breakdown__visual">
        <div className="source-breakdown__donut" role="img" aria-label={pieLabel}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle className="source-breakdown__ring-base" cx="50" cy="50" r="40" />
            {pieSegments.map(({ source, start, size }) => <circle key={source.name} className={`source-breakdown__segment${activeSource && activeSource !== source.name ? " is-muted" : ""}`} cx="50" cy="50" r="40" pathLength="100" stroke={colorFor(source.name)} strokeDasharray={`${size} ${100 - size}`} strokeDashoffset={-start} onMouseEnter={() => setActiveSource(source.name)} onMouseLeave={() => setActiveSource(null)} />)}
          </svg>
          <div className="source-breakdown__donut-center" aria-hidden="true"><strong>{format(Number(highlighted?.sent ?? sent))}</strong><span>{highlighted ? highlighted.name : "marked applied"}</span></div>
        </div>
        <p><strong>{format(tracked)}</strong> applications tracked</p>
      </div>
      <div className="source-breakdown__distribution">
        <div className="source-breakdown__column-head"><span>Source</span><span>Applied / tracked</span></div>
        <div className="source-breakdown__list">{rows.map((source) => {
          const count = Number(source.applications) || 0;
          const sentCount = Number(source.sent) || 0;
          return <div className={`source-breakdown__row${activeSource === source.name ? " is-active" : ""}`} key={source.name} tabIndex={0} aria-label={`${source.name}: ${sentCount} marked applied out of ${count} tracked`} onMouseEnter={() => setActiveSource(source.name)} onMouseLeave={() => setActiveSource(null)} onFocus={() => setActiveSource(source.name)} onBlur={() => setActiveSource(null)}>
            <div className="source-breakdown__label"><strong><i className="source-breakdown__swatch" style={{ backgroundColor: colorFor(source.name) }} aria-hidden="true" />{source.name}</strong><span>{format(sentCount)} / {format(count)}</span></div>
            <div className="source-breakdown__track" aria-hidden="true"><span style={{ width: `${count ? 100 * sentCount / count : 0}%`, backgroundColor: colorFor(source.name) }} /></div>
          </div>;
        })}</div>
      </div>
    </div>
    <p className="source-breakdown__note">The ring shows where members marked applications as applied. Each row shows marked-applied records out of all tracked records for that source.</p>
  </div>;

  return <div className="source-breakdown">
    <div className="source-breakdown__list">{rows.map((source) => {
      const count = Number(source.applications) || 0;
      const share = tracked ? Math.round(100 * count / tracked) : 0;
      return <div className="source-breakdown__row" key={source.name} title={`${source.name}: ${count} tracked applications`}>
        <div className="source-breakdown__label"><strong>{source.name}</strong><span>{format(count)} tracked · {share}%</span></div>
        <div className="source-breakdown__track" aria-hidden="true"><span style={{ width: `${100 * count / max}%`, backgroundColor: colorFor(source.name) }} /></div>
      </div>;
    })}</div>
  </div>;
}
