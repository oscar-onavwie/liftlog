import { useState } from "react";
import { MUSCLE_ORDER } from "../data/exercises";
import type { AppData, Equipment, Exercise, Muscle } from "../types";

interface Props {
  data: AppData;
  exercises: Exercise[];
  update: (change: (old: AppData) => AppData) => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function ExercisesScreen({ data, exercises, update }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState<Muscle>("chest");
  const [equipment, setEquipment] = useState<Equipment>("machine");
  const [compound, setCompound] = useState(false);
  const [message, setMessage] = useState("");

  function save() {
    const clean = name.trim();
    if (!clean) return setMessage("Give the exercise a name first.");
    if (exercises.some((e) => e.name.toLowerCase() === clean.toLowerCase()))
      return setMessage("You already have an exercise with that name.");
    const exercise: Exercise = {
      id: `custom-${Date.now().toString(36)}`,
      name: clean,
      muscle,
      equipment,
      compound,
      stepKg: equipment === "dumbbell" ? 2 : 2.5,
      custom: true,
    };
    update((d) => ({ ...d, customExercises: [...d.customExercises, exercise] }));
    setName("");
    setMessage("");
    setAdding(false);
  }

  function remove(exercise: Exercise) {
    const used = data.templates.find((t) => t.exercises.some((e) => e.exerciseId === exercise.id));
    if (used) return setMessage(`"${exercise.name}" is used in "${used.name}". Remove it there first.`);
    update((d) => ({ ...d, customExercises: d.customExercises.filter((e) => e.id !== exercise.id) }));
    setMessage("");
  }

  return (
    <section>
      <h1>Exercises</h1>
      {message && <p className="notice">{message}</p>}

      {adding ? (
        <div className="card form">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hack Squat" />
          </label>
          <label>
            Muscle group
            <select value={muscle} onChange={(e) => setMuscle(e.target.value as Muscle)}>
              {MUSCLE_ORDER.map((m) => (
                <option key={m} value={m}>{cap(m)}</option>
              ))}
            </select>
          </label>
          <label>
            Equipment
            <select value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
              {(["barbell", "dumbbell", "machine", "cable", "bodyweight"] as Equipment[]).map((q) => (
                <option key={q} value={q}>{cap(q)}</option>
              ))}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" checked={compound} onChange={(e) => setCompound(e.target.checked)} />
            Big multi-joint lift (like a squat or press)
          </label>
          <div className="row">
            <button className="primary" onClick={save}>Save exercise</button>
            <button onClick={() => { setAdding(false); setMessage(""); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="primary wide" onClick={() => setAdding(true)}>+ Add your own exercise</button>
      )}

      {MUSCLE_ORDER.map((m) => {
        const list = exercises.filter((e) => e.muscle === m);
        if (list.length === 0) return null;
        return (
          <div key={m}>
            <h2>{cap(m)}</h2>
            <ul className="list">
              {list.map((e) => (
                <li key={e.id}>
                  <div>
                    <strong>{e.name}</strong>
                    <span className="muted"> · {e.equipment}{e.compound ? " · big lift" : ""}</span>
                  </div>
                  {e.custom && <button className="small danger" onClick={() => remove(e)}>Delete</button>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
