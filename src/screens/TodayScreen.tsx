import { useState } from "react";
import {
  addSet, countDoneSets, describeSets, finishSession, formatKg, isSetComplete, lastPerformance,
  nextTemplate, removeLastSet, setField, startSession, toggleDone, totalVolumeKg,
} from "../sessions";
import type { ActiveSession, AppData, Exercise, Session } from "../types";

interface Props {
  data: AppData;
  exercises: Exercise[];
  update: (change: (old: AppData) => AppData) => void;
}

export function TodayScreen({ data, exercises, update }: Props) {
  const [summary, setSummary] = useState<Session | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const active = data.activeSession;
  const byId = new Map(exercises.map((e) => [e.id, e]));

  const setActive = (next: ActiveSession | null) => update((d) => ({ ...d, activeSession: next }));

  // ---- Just finished: show a short summary ----
  if (!active && summary) {
    const sets = summary.exercises.reduce((n, e) => n + e.sets.length, 0);
    return (
      <section>
        <h1>Nice work! 💪</h1>
        <div className="card">
          <strong>{summary.templateName}</strong>
          <p className="muted">
            {sets} sets · {summary.exercises.length} exercises · {Math.round(totalVolumeKg(summary)).toLocaleString()} kg lifted in total
          </p>
        </div>
        <button className="primary wide" onClick={() => setSummary(null)}>Done</button>
      </section>
    );
  }

  // ---- No workout started yet ----
  if (!active) {
    const next = nextTemplate(data.templates, data.sessions);
    return (
      <section>
        <h1>Today</h1>
        {data.templates.length === 0 ? (
          <p>You have no saved workouts yet. Create one on the Workouts tab.</p>
        ) : (
          <>
            <p className="muted">Pick a workout to start.</p>
            {data.templates.map((t) => (
              <button
                key={t.id}
                className={`wide ${t.id === next?.id ? "primary" : ""}`}
                onClick={() => setActive(startSession(t, data.sessions, exercises, new Date()))}
                disabled={t.exercises.length === 0}
              >
                {t.id === next?.id ? `▶ Start ${t.name} (up next)` : `Start ${t.name}`}
              </button>
            ))}
          </>
        )}
      </section>
    );
  }

  // ---- Workout in progress ----
  const done = countDoneSets(active);

  function finish() {
    const result = finishSession(active!, new Date());
    if (!result) return;
    update((d) => ({ ...d, sessions: [...d.sessions, result], activeSession: null }));
    setSummary(result);
    setConfirmCancel(false);
  }

  return (
    <section>
      <h1>{active.templateName}</h1>
      <p className="muted">Fill in weight and reps, then tap ✓ for each set you finish.</p>

      {active.exercises.map((de, ei) => {
        const exercise = byId.get(de.exerciseId);
        const last = lastPerformance(data.sessions, de.exerciseId);
        return (
          <div className="card" key={`${de.exerciseId}-${ei}`}>
            <strong>{exercise?.name ?? "(exercise no longer exists)"}</strong>
            <div className="muted">Plan: {de.sets.length} sets of {de.repMin}–{de.repMax} reps</div>
            <div className="muted">{last ? `Last time: ${describeSets(last)}` : "Last time: first time doing this"}</div>
            {de.recommendation && (
              <div className={`goal ${de.recommendation.kind}`}>
                <strong>
                  {de.recommendation.weightKg === null
                    ? "Today's goal: you choose the weight"
                    : `Today's goal: ${formatKg(de.recommendation.weightKg)} kg × ${de.recommendation.targetReps} reps, every set`}
                </strong>
                <div>{de.recommendation.message}</div>
              </div>
            )}

            <div className="setgrid head muted"><span>Set</span><span>kg</span><span>Reps</span><span /></div>
            {de.sets.map((s, si) => (
              <div className={`setgrid ${s.done ? "done" : ""}`} key={si}>
                <span>{si + 1}</span>
                <input
                  inputMode="decimal"
                  value={s.weight}
                  placeholder="kg"
                  aria-label={`Set ${si + 1} weight`}
                  onChange={(e) => setActive(setField(active, ei, si, "weight", e.target.value))}
                />
                <input
                  inputMode="numeric"
                  value={s.reps}
                  placeholder={de.recommendation ? String(de.recommendation.targetReps) : "reps"}
                  aria-label={`Set ${si + 1} reps`}
                  onChange={(e) => setActive(setField(active, ei, si, "reps", e.target.value))}
                />
                <button
                  className={s.done ? "primary" : ""}
                  aria-label={`Set ${si + 1} done`}
                  disabled={!s.done && !isSetComplete(s)}
                  onClick={() => setActive(toggleDone(active, ei, si))}
                >
                  ✓
                </button>
              </div>
            ))}

            <div className="row" style={{ marginTop: 10 }}>
              <button className="small" onClick={() => setActive(addSet(active, ei))}>+ Add set</button>
              <button className="small" onClick={() => setActive(removeLastSet(active, ei))} disabled={de.sets.length <= 1}>− Remove set</button>
            </div>
          </div>
        );
      })}

      <button className="primary wide" onClick={finish} disabled={done === 0}>
        Finish workout ({done} {done === 1 ? "set" : "sets"} done)
      </button>

      {confirmCancel ? (
        <div className="row">
          <button className="danger" onClick={() => { setActive(null); setConfirmCancel(false); }}>Yes, throw this workout away</button>
          <button onClick={() => setConfirmCancel(false)}>Keep going</button>
        </div>
      ) : (
        <button className="danger" onClick={() => setConfirmCancel(true)}>Cancel workout</button>
      )}
    </section>
  );
}
