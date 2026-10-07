import { useState } from "react";
import { formatDay } from "../history";
import { formatKg } from "../sessions";
import { niceTicks, type StrengthPoint } from "../stats";

interface Props {
  points: StrengthPoint[];
  /** Changing this resets which point is selected (e.g. when another exercise is picked). */
  resetKey: string;
}

const W = 340, H = 200, LEFT = 40, RIGHT = 18, TOP = 18, BOTTOM = 30;

function readout(p: StrengthPoint): string {
  return `${formatDay(p.at)} · estimated best ${formatKg(p.estimatedMaxKg)} kg · top set ${formatKg(p.topSet.weightKg)} kg × ${p.topSet.reps}${p.lowEnergy ? " · low-energy day" : ""}`;
}

export function StrengthChart({ points, resetKey }: Props) {
  const [state, setState] = useState<{ key: string; index: number | null }>({ key: resetKey, index: null });
  const picked = state.key === resetKey ? state.index : null;
  const selected = Math.min(picked ?? points.length - 1, points.length - 1);
  const select = (index: number) => setState({ key: resetKey, index });

  const values = points.map((p) => p.estimatedMaxKg);
  const lo = Math.min(...values), hi = Math.max(...values);
  // A single (or perfectly flat) value would give a squashed axis, so give it some room.
  const ticks = hi > lo ? niceTicks(lo, hi, 4) : niceTicks(lo * 0.9, hi * 1.05, 3);
  const yMin = ticks[0]!, yMax = ticks[ticks.length - 1]!;
  const plotW = W - LEFT - RIGHT, plotH = H - TOP - BOTTOM;
  const t0 = new Date(points[0]!.at).getTime();
  const t1 = new Date(points[points.length - 1]!.at).getTime();
  const x = (p: StrengthPoint) => (t1 === t0 ? LEFT + plotW / 2 : LEFT + (plotW * (new Date(p.at).getTime() - t0)) / (t1 - t0));
  const y = (v: number) => TOP + plotH * (1 - (v - yMin) / (yMax - yMin));
  // The line joins normal days only: a low-energy day is shown as a dot but never drags the line down.
  const normal = points.filter((p) => !p.lowEnergy);
  const line = normal.map((p, i) => `${i === 0 ? "M" : "L"}${x(p).toFixed(1)},${y(p.estimatedMaxKg).toFixed(1)}`).join(" ");
  const sel = points[selected]!;
  const last = points[points.length - 1]!;

  /** Pick the point closest (left-right) to where the finger or pointer is. */
  function nearest(e: React.PointerEvent<SVGRectElement>) {
    // Measure against the whole drawing (not the touch-area rectangle, which starts part-way in).
    const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    points.forEach((p, i) => { if (Math.abs(x(p) - px) < Math.abs(x(points[best]!) - px)) best = i; });
    select(best);
  }

  return (
    <div>
      <p className="readout">{readout(sel)}</p>
      <svg
        viewBox={`0 0 ${W} ${H}`} className="chart" tabIndex={0} role="img"
        aria-label={`Estimated best lift over ${points.length} sessions. Latest: ${readout(last)}. Use left and right arrow keys to move between sessions.`}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") select(Math.max(0, selected - 1));
          if (e.key === "ArrowRight") select(Math.min(points.length - 1, selected + 1));
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={LEFT} x2={W - RIGHT} y1={y(t)} y2={y(t)} className="grid" />
            <text x={LEFT - 6} y={y(t) + 4} textAnchor="end" className="axis">{formatKg(t)}</text>
          </g>
        ))}
        <text x={LEFT} y={H - 8} textAnchor="start" className="axis">{formatDay(points[0]!.at)}</text>
        {points.length > 1 && <text x={W - RIGHT} y={H - 8} textAnchor="end" className="axis">{formatDay(last.at)}</text>}

        <line x1={x(sel)} x2={x(sel)} y1={TOP} y2={TOP + plotH} className="crosshair" />
        {normal.length > 1 && <path d={line} className="line" />}
        {points.map((p, i) => (
          <circle key={p.sessionId} cx={x(p)} cy={y(p.estimatedMaxKg)} r={i === selected ? 6 : 4.5} className={p.lowEnergy ? "dot-low" : "dot-normal"} />
        ))}
        {/* One direct label: the latest value. */}
        <text x={Math.min(x(last), W - RIGHT)} y={y(last.estimatedMaxKg) - 11} textAnchor="end" className="value-label">{formatKg(last.estimatedMaxKg)}</text>

        <rect
          x={LEFT - 10} y={TOP - 10} width={plotW + 20} height={plotH + 20} className="hit" style={{ touchAction: "pan-y" }}
          onPointerDown={nearest} onPointerMove={(e) => e.buttons === 1 && nearest(e)}
        />
      </svg>

      <div className="legend">
        <span><i className="key normal" /> Normal day</span>
        <span><i className="key low" /> Low-energy day (not joined to the line)</span>
      </div>

      <details>
        <summary>View as table</summary>
        <table className="table">
          <thead><tr><th>Date</th><th>Top set</th><th>Est. best</th></tr></thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.sessionId}>
                <td>{formatDay(p.at)}{p.lowEnergy ? " (low-energy)" : ""}</td>
                <td>{formatKg(p.topSet.weightKg)} kg × {p.topSet.reps}</td>
                <td>{formatKg(p.estimatedMaxKg)} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
