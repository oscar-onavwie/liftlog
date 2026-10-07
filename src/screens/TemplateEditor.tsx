import { useState } from "react";
import { LIMITS, addExercise, moveExercise, removeExercise, updateExercise } from "../templates";
import type { Exercise, Template } from "../types";

interface Props {
  template: Template;
  exercises: Exercise[];
  onChange: (template: Template) => void;
  onDelete: () => void;
  onBack: () => void;
}

/** A − / + control, so numbers can be changed without the phone keyboard. */
function Stepper(props: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  const { label, value, min, max, onChange } = props;
  return (
    <div className="stepper" aria-label={label}>
      <span className="muted">{label}</span>
      <button className="small" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`less ${label}`}>−</button>
      <strong>{value}</strong>
      <button className="small" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`more ${label}`}>+</button>
    </div>
  );
}

export function TemplateEditor({ template, exercises, onChange, onDelete, onBack }: Props) {
  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const unused = exercises.filter((e) => !template.exercises.some((t) => t.exerciseId === e.id));

  return (
    <section>
      <button className="small" onClick={onBack}>← Back</button>
      <h1>
        <input
          className="title-input"
          value={template.name}
          onChange={(e) => onChange({ ...template, name: e.target.value })}
          aria-label="Workout name"
        />
      </h1>

      {template.exercises.length === 0 && <p className="muted">No exercises yet. Add one below.</p>}

      {template.exercises.map((entry, i) => {
        const exercise = byId.get(entry.exerciseId);
        return (
          <div className="card" key={`${entry.exerciseId}-${i}`}>
            <div className="row between">
              <strong>{exercise ? exercise.name : "(exercise no longer exists)"}</strong>
              <div className="row">
                <button className="small" onClick={() => onChange(moveExercise(template, i, -1))} disabled={i === 0} aria-label="Move up">↑</button>
                <button className="small" onClick={() => onChange(moveExercise(template, i, 1))} disabled={i === template.exercises.length - 1} aria-label="Move down">↓</button>
                <button className="small danger" onClick={() => onChange(removeExercise(template, i))} aria-label="Remove">✕</button>
              </div>
            </div>
            <Stepper label="Sets" value={entry.sets} min={LIMITS.minSets} max={LIMITS.maxSets}
              onChange={(n) => onChange(updateExercise(template, i, { sets: n }))} />
            <Stepper label="Min reps" value={entry.repMin} min={LIMITS.minReps} max={LIMITS.maxReps}
              onChange={(n) => onChange(updateExercise(template, i, { repMin: n }))} />
            <Stepper label="Max reps" value={entry.repMax} min={LIMITS.minReps} max={LIMITS.maxReps}
              onChange={(n) => onChange(updateExercise(template, i, { repMax: n }))} />
          </div>
        );
      })}

      {picking ? (
        <div className="card">
          <label>
            Pick an exercise to add
            <select
              defaultValue=""
              onChange={(e) => {
                const chosen = byId.get(e.target.value);
                if (chosen) onChange(addExercise(template, chosen));
                setPicking(false);
              }}
            >
              <option value="" disabled>Choose…</option>
              {unused.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </label>
          <button onClick={() => setPicking(false)}>Cancel</button>
        </div>
      ) : (
        <button className="primary wide" onClick={() => setPicking(true)}>+ Add exercise</button>
      )}

      <hr />
      {confirmDelete ? (
        <div className="row">
          <button className="danger" onClick={onDelete}>Yes, delete this workout</button>
          <button onClick={() => setConfirmDelete(false)}>Keep it</button>
        </div>
      ) : (
        <button className="danger" onClick={() => setConfirmDelete(true)}>Delete workout</button>
      )}
    </section>
  );
}
