import { useState } from "react";
import { newTemplate } from "../templates";
import type { AppData, Exercise } from "../types";
import { TemplateEditor } from "./TemplateEditor";

interface Props {
  data: AppData;
  exercises: Exercise[];
  update: (change: (old: AppData) => AppData) => void;
}

export function WorkoutsScreen({ data, exercises, update }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = data.templates.find((t) => t.id === openId);

  if (open) {
    return (
      <TemplateEditor
        template={open}
        exercises={exercises}
        onBack={() => setOpenId(null)}
        onChange={(t) => update((d) => ({ ...d, templates: d.templates.map((x) => (x.id === t.id ? t : x)) }))}
        onDelete={() => {
          update((d) => ({ ...d, templates: d.templates.filter((x) => x.id !== open.id) }));
          setOpenId(null);
        }}
      />
    );
  }

  const byId = new Map(exercises.map((e) => [e.id, e]));

  return (
    <section>
      <h1>Workouts</h1>
      <p className="muted">Your saved workouts. Tap one to edit it.</p>
      {data.templates.length === 0 && <p>You have no workouts yet. Add one below.</p>}
      <ul className="list">
        {data.templates.map((t) => (
          <li key={t.id}>
            <button className="row-button" onClick={() => setOpenId(t.id)}>
              <strong>{t.name}</strong>
              <span className="muted">
                {t.exercises.length} exercises
                {t.exercises.length > 0 &&
                  ` · ${t.exercises.slice(0, 3).map((e) => byId.get(e.exerciseId)?.name ?? "?").join(", ")}${t.exercises.length > 3 ? "…" : ""}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button
        className="primary wide"
        onClick={() => {
          const t = newTemplate("New workout");
          update((d) => ({ ...d, templates: [...d.templates, t] }));
          setOpenId(t.id);
        }}
      >
        + New workout
      </button>
    </section>
  );
}
