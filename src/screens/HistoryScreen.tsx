import { useState } from "react";
import { countSets, durationMinutes, formatDay, formatTime, newestFirst, removeSession } from "../history";
import { describeSets, totalVolumeKg } from "../sessions";
import type { AppData, Exercise } from "../types";

interface Props {
  data: AppData;
  exercises: Exercise[];
  update: (change: (old: AppData) => AppData) => void;
}

export function HistoryScreen({ data, exercises, update }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const sessions = newestFirst(data.sessions);
  const open = sessions.find((s) => s.id === openId);

  if (open) {
    return (
      <section>
        <button className="small" onClick={() => { setOpenId(null); setConfirmDelete(false); }}>← Back</button>
        <h1>{open.templateName}</h1>
        <p className="muted">
          {formatDay(open.startedAt)} · {formatTime(open.startedAt)} · {durationMinutes(open)} min ·{" "}
          {Math.round(totalVolumeKg(open)).toLocaleString()} kg lifted
        </p>
        {open.exercises.map((e, i) => (
          <div className="card" key={`${e.exerciseId}-${i}`}>
            <strong>{byId.get(e.exerciseId)?.name ?? "(exercise no longer exists)"}</strong>
            <div className="muted">
              Goal was {e.targetSets} sets of {e.repMin}–{e.repMax} reps
            </div>
            {e.sets.map((s, j) => (
              <div className="histset" key={j}>
                <span className="muted">Set {j + 1}</span>
                <span>{s.weightKg} kg × {s.reps}</span>
              </div>
            ))}
            <div className="muted" style={{ marginTop: 8 }}>{describeSets(e.sets)}</div>
          </div>
        ))}
        <hr />
        {confirmDelete ? (
          <div className="row">
            <button
              className="danger"
              onClick={() => {
                update((d) => ({ ...d, sessions: removeSession(d.sessions, open.id) }));
                setOpenId(null);
                setConfirmDelete(false);
              }}
            >
              Yes, delete this workout
            </button>
            <button onClick={() => setConfirmDelete(false)}>Keep it</button>
          </div>
        ) : (
          <button className="danger" onClick={() => setConfirmDelete(true)}>Delete this workout</button>
        )}
      </section>
    );
  }

  return (
    <section>
      <h1>History</h1>
      {sessions.length === 0 ? (
        <p className="muted">No finished workouts yet. When you finish one on the Today tab, it appears here.</p>
      ) : (
        <>
          <p className="muted">{sessions.length} {sessions.length === 1 ? "workout" : "workouts"} logged. Tap one to see the details.</p>
          <ul className="list">
            {sessions.map((s) => (
              <li key={s.id}>
                <button className="row-button" onClick={() => setOpenId(s.id)}>
                  <strong>{s.templateName}</strong>
                  <span className="muted">
                    {formatDay(s.startedAt)} · {countSets(s)} sets · {durationMinutes(s)} min
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
