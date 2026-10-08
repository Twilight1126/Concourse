import { useState } from "react";
import "./StageDonut.css";
import { STAGE_COLORS } from "./dashboard-data";

const stageLabel = (stage) => stage === "interviewing" ? "Interview" : stage[0].toUpperCase() + stage.slice(1);

export default function StageDonut({ counts, stages, title = "Application stages", centerLabel = "applications", colors = STAGE_COLORS }) {
  const [hoveredStage, setHoveredStage] = useState(null);
  const [selectedStage, setSelectedStage] = useState(null);
  const total = stages.reduce((sum, stage) => sum + (Number(counts[stage]) || 0), 0);
  const slices = stages.flatMap((stage, index) => {
    const value = Number(counts[stage]) || 0;
    if (!value) return [];
    const start = stages.slice(0, index).reduce((sum, previous) => sum + (Number(counts[previous]) || 0), 0) / total * 100;
    return [{ stage, value, start, percent: value / total * 100, color: colors[index] }];
  });
  const activeStage = hoveredStage ?? selectedStage;
  const active = activeStage && stages.includes(activeStage) ? {
    stage: activeStage,
    value: Number(counts[activeStage]) || 0,
    percent: total ? (Number(counts[activeStage]) || 0) / total * 100 : 0,
  } : null;
  const select = (stage) => setSelectedStage((previous) => previous === stage ? null : stage);

  return <div className="stage-donut-layout">
    <div className="stage-donut" role="img" aria-label={`${title}: ${stages.map((stage) => `${stageLabel(stage)} ${counts[stage] || 0}`).join(", ")}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true" onMouseLeave={() => setHoveredStage(null)}>
        <circle className="stage-donut__track" cx="60" cy="60" r="43" fill="none" strokeWidth="17" />
        <g transform="rotate(-90 60 60)">{slices.map((slice) => <circle
          key={slice.stage} className={`stage-donut__slice${activeStage === slice.stage ? " is-active" : ""}`}
          cx="60" cy="60" r="43" fill="none" stroke={slice.color} strokeWidth="17" pathLength="100"
          strokeDasharray={`${slice.percent} ${100 - slice.percent}`} strokeDashoffset={-slice.start}
          onMouseEnter={() => setHoveredStage(slice.stage)} onClick={() => select(slice.stage)}
        ><title>{`${stageLabel(slice.stage)}: ${slice.value} (${Math.round(slice.percent)}%)`}</title></circle>)}</g>
      </svg>
      <span className="stage-donut__center"><strong>{(active?.value ?? total).toLocaleString("en-IN")}</strong><small>{active ? `${stageLabel(active.stage)} · ${Math.round(active.percent)}%` : centerLabel}</small></span>
    </div>
    <div className="stage-donut-legend">{stages.map((stage, index) => <button
      key={stage} type="button" className={activeStage === stage ? "is-active" : ""}
      aria-label={`${stageLabel(stage)}: ${Number(counts[stage]) || 0} ${centerLabel}`}
      onMouseEnter={() => setHoveredStage(stage)} onMouseLeave={() => setHoveredStage(null)}
      onFocus={() => setHoveredStage(stage)} onBlur={() => setHoveredStage(null)}
      onClick={() => select(stage)}
    ><i style={{ backgroundColor: colors[index] }} /><span>{stageLabel(stage)}</span><strong>{Number(counts[stage]) || 0}</strong></button>)}</div>
  </div>;
}
