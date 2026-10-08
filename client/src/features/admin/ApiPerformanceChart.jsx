import { useState } from "react";
import { groupApiMinutes } from "./api-performance-data";
import "./ApiPerformanceChart.css";

const format = (value) => Number(value || 0).toLocaleString("en-IN");
const time = (value) => new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export default function ApiPerformanceChart({ series = [] }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const buckets = groupApiMinutes(series);
  const peak = Math.max(0, ...buckets.map((bucket) => bucket.requests));
  const scale = Math.max(1, peak);
  const active = buckets[activeIndex];

  return <div className="admin-api-graph">
    <div className="admin-api-graph__heading"><strong>Request volume</strong><span>5-minute intervals</span></div>
    <div className="admin-api-graph__plot" role="group" aria-label="Requests and server errors in five-minute intervals">
      <div className="admin-api-graph__scale" aria-hidden="true"><span>{peak ? format(peak) : ""}</span><span>0</span></div>
      <div className="admin-api-graph__bars">
        {!peak && <span className="admin-api-graph__empty">No requests recorded in this hour</span>}
        {buckets.map((bucket, index) => {
          const label = `${time(bucket.start)}–${time(bucket.end)}: ${format(bucket.requests)} requests, ${format(bucket.errors)} server errors`;
          return <div key={bucket.start} className="admin-api-graph__slot" tabIndex={0} role="img" aria-label={label} onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)}>
            <div className={`admin-api-graph__bar${activeIndex === index ? " is-active" : ""}`} style={{ height: `${100 * bucket.requests / scale}%` }} aria-hidden="true">
              <span className="admin-api-graph__success" style={{ flex: Math.max(0, bucket.requests - bucket.errors) }} />
              {bucket.errors > 0 && <span className="admin-api-graph__errors" style={{ flex: bucket.errors }} />}
            </div>
          </div>;
        })}
      </div>
    </div>
    <div className="admin-api-graph__axis" aria-hidden="true"><span>{series[0] ? time(series[0].minute) : ""}</span><span>{series[30] ? time(series[30].minute) : ""}</span><span>{series.at(-1) ? time(series.at(-1).minute) : ""}</span></div>
    <div className="admin-api-graph__footer"><span className="admin-api-graph__key"><i />Other requests <i className="admin-api-graph__key-error" />Server errors</span><span className="admin-api-graph__detail" role="status">{active ? `${time(active.start)}–${time(active.end)} · ${format(active.requests)} requests · ${format(active.errors)} server errors` : peak ? "Hover or focus a bar for exact counts" : ""}</span></div>
  </div>;
}
