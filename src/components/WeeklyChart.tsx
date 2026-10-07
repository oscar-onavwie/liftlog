import { useState } from "react";
import { formatDay } from "../history";
import type { WeekBucket } from "../stats";

interface Props {
  weeks: WeekBucket[];
  target: number;
}

const W = 340, H = 190, LEFT = 28, RIGHT = 8, TOP = 20, BOTTOM = 28;
const BAR = 22; // bars stay thin, never fill the slot
const GAP = 2; // surface-coloured gap between stacked segments
const R = 4;

/** A bar with only its top corners rounded (the baseline end stays square). */
function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h / 2, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

function describe(w: WeekBucket): string {
  const total = w.normal + w.lowEnergy;
  if (total === 0) return `Week of ${formatDay(w.start.toISOString())}: no workouts`;
  const parts = [`${w.normal} on normal days`, `${w.lowEnergy} on low-energy days`].filter((_, i) => (i === 0 ? w.normal : w.lowEnergy) > 0);
  return `Week of ${formatDay(w.start.toISOString())}: ${total} ${total === 1 ? "workout" : "workouts"} (${parts.join(", ")})`;
}

export function WeeklyChart({ weeks, target }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const selected = picked ?? weeks.length - 1;

  const peak = Math.max(target, ...weeks.map((w) => w.normal + w.lowEnergy), 1);
  const step = Math.ceil(peak / 4);
  const ticks: number[] = [];
  for (let v = 0; v < peak + step; v += step) {
    ticks.push(v);
    if (v >= peak) break;
  }
  const yMax = ticks[ticks.length - 1]!;
  const plotH = H - TOP - BOTTOM;
  const plotW = W - LEFT - RIGHT;
  const slot = plotW / weeks.length;
  const y = (v: number) => TOP + plotH * (1 - v / yMax);
  const base = y(0);

  return (
    <div>
      <p className="readout">{describe(weeks[selected]!)}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`Workouts per week for the last ${weeks.length} weeks. ${describe(weeks[weeks.length - 1]!)}. Target ${target} per week.`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={LEFT} x2={W - RIGHT} y1={y(t)} y2={y(t)} className="grid" />
            <text x={LEFT - 6} y={y(t) + 4} textAnchor="end" className="axis">{t}</text>
          </g>
        ))}
        {weeks.map((w, i) => {
          const cx = LEFT + slot * i + slot / 2;
          const x = cx - BAR / 2;
          const total = w.normal + w.lowEnergy;
          const hNormal = plotH * (w.normal / yMax);
          const hLow = plotH * (w.lowEnergy / yMax);
          const showLabel = i % 2 === (weeks.length - 1) % 2;
          return (
            <g key={w.start.getTime()}>
              {i === selected && <rect x={LEFT + slot * i + 1} y={TOP - 6} width={slot - 2} height={plotH + 6} className="selected-slot" rx={6} />}
              {w.normal > 0 && (
                <path d={w.lowEnergy > 0 ? `M${x},${base} V${base - hNormal} H${x + BAR} V${base} Z` : roundedTop(x, base - hNormal, BAR, hNormal, R)} className="bar-normal" />
              )}
              {w.lowEnergy > 0 && (
                <path d={roundedTop(x, base - hNormal - hLow, BAR, Math.max(hLow - (w.normal > 0 ? GAP : 0), 1), R)} className="bar-low" />
              )}
              {total > 0 && <text x={cx} y={base - hNormal - hLow - 5} textAnchor="middle" className="value-label">{total}</text>}
              {showLabel && <text x={cx} y={H - 8} textAnchor="middle" className="axis">{formatDay(w.start.toISOString()).replace(/^\w+,? /, "")}</text>}
              <rect
                x={LEFT + slot * i} y={TOP - 6} width={slot} height={plotH + BOTTOM + 6}
                className="hit" role="button" tabIndex={0} aria-label={describe(w)}
                onClick={() => setPicked(i)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setPicked(i)}
              />
            </g>
          );
        })}
        {/* The target line is drawn over the bars so it always shows. */}
        <line x1={LEFT} x2={W - RIGHT} y1={y(target)} y2={y(target)} className="target" />
      </svg>

      <div className="legend">
        <span><i className="key normal" /> Normal day</span>
        <span><i className="key low" /> Low-energy day</span>
        <span><i className="key line" /> Target ({target}/week)</span>
      </div>

      <details>
        <summary>View as table</summary>
        <table className="table">
          <thead><tr><th>Week of</th><th>Normal</th><th>Low-energy</th></tr></thead>
          <tbody>
            {[...weeks].reverse().map((w) => (
              <tr key={w.start.getTime()}><td>{formatDay(w.start.toISOString())}</td><td>{w.normal}</td><td>{w.lowEnergy}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
