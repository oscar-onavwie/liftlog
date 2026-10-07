import { lighter, recommend } from "./progression";
import { isReduced, planWorkout } from "./readiness";
import type {
  ActiveSession,
  DraftExercise,
  DraftSet,
  Exercise,
  LoggedSet,
  Readiness,
  Session,
  Template,
} from "./types";

// Plain helper functions for running a workout. Like the template helpers,
// they return edited copies and never change what you pass in.

/** Read a number the user typed. Accepts "66.5" and "66,5". Returns NaN if it isn't a number. */
export function parseNumber(text: string): number {
  const cleaned = text.trim().replace(",", ".");
  if (cleaned === "") return NaN;
  return Number(cleaned);
}

/** Format a weight without pointless decimals: 66 -> "66", 66.5 -> "66.5". */
export function formatKg(kg: number): string {
  return String(Math.round(kg * 100) / 100);
}

/** The most recent finished sets for an exercise, or undefined if it was never done. */
export function lastPerformance(sessions: Session[], exerciseId: string): LoggedSet[] | undefined {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const found = sessions[i]!.exercises.find((e) => e.exerciseId === exerciseId && e.sets.length > 0);
    if (found) return found.sets;
  }
  return undefined;
}

/** "66 kg: 8, 7, 6" — groups neighbouring sets that used the same weight. */
export function describeSets(sets: LoggedSet[]): string {
  const groups: { kg: number; reps: number[] }[] = [];
  for (const s of sets) {
    const last = groups[groups.length - 1];
    if (last && last.kg === s.weightKg) last.reps.push(s.reps);
    else groups.push({ kg: s.weightKg, reps: [s.reps] });
  }
  return groups.map((g) => `${formatKg(g.kg)} kg: ${g.reps.join(", ")}`).join(" · ");
}

/** Which workout to suggest: the one after the one you did last (looping around), else the first. */
export function nextTemplate(templates: Template[], sessions: Session[]): Template | undefined {
  if (templates.length === 0) return undefined;
  const last = sessions[sessions.length - 1];
  if (!last) return templates[0];
  const i = templates.findIndex((t) => t.id === last.templateId);
  return templates[(i + 1) % templates.length];
}

/**
 * Begin a workout from a template, adapted to how the user feels.
 * Each exercise gets a recommended weight (pre-filled) and a rep goal.
 */
export function startSession(
  template: Template,
  sessions: Session[],
  exercises: Exercise[],
  now: Date,
  readiness: Readiness = "average"
): ActiveSession {
  const stepFor = (id: string) => exercises.find((e) => e.id === id)?.stepKg ?? 2.5;
  const drafts: DraftExercise[] = planWorkout(template, exercises, readiness).map((te) => {
    let recommendation = recommend({
      exerciseId: te.exerciseId,
      stepKg: stepFor(te.exerciseId),
      sets: te.sets,
      repMin: te.repMin,
      repMax: te.repMax,
      sessions,
      now,
      easyDay: isReduced(readiness),
    });
    if (readiness === "exhausted" && recommendation.weightKg !== null) {
      // Minimum effective workout: about 10% lighter than usual, and stop with reps to spare.
      const lightKg = lighter(recommendation.weightKg, 0.1, stepFor(te.exerciseId));
      recommendation = {
        ...recommendation,
        weightKg: lightKg,
        message: `Exhausted day: ${formatKg(lightKg)} kg (a bit lighter than usual), ${te.sets} sets. Stop each set with 2 or more reps left in the tank.`,
      };
    }
    const weight = recommendation.weightKg === null ? "" : formatKg(recommendation.weightKg);
    const sets: DraftSet[] = Array.from({ length: te.sets }, () => ({ weight, reps: "", done: false }));
    return { exerciseId: te.exerciseId, repMin: te.repMin, repMax: te.repMax, sets, recommendation };
  });
  return {
    id: `s-${now.getTime().toString(36)}`,
    templateId: template.id,
    templateName: template.name,
    startedAt: now.toISOString(),
    exercises: drafts,
    readiness,
  };
}

function editSet(
  session: ActiveSession,
  exIndex: number,
  setIndex: number,
  edit: (set: DraftSet) => DraftSet
): ActiveSession {
  return {
    ...session,
    exercises: session.exercises.map((e, i) =>
      i !== exIndex ? e : { ...e, sets: e.sets.map((s, j) => (j !== setIndex ? s : edit(s))) }
    ),
  };
}

/** Type into a weight or reps box. Changing a number un-ticks the set, so you re-confirm it. */
export function setField(
  session: ActiveSession,
  exIndex: number,
  setIndex: number,
  field: "weight" | "reps",
  value: string
): ActiveSession {
  return editSet(session, exIndex, setIndex, (s) => ({ ...s, [field]: value, done: false }));
}

/** Can this set be ticked as done? Needs a whole number of reps above 0 and a weight of 0 or more. */
export function isSetComplete(set: DraftSet): boolean {
  const reps = parseNumber(set.reps);
  const weight = parseNumber(set.weight);
  return Number.isInteger(reps) && reps > 0 && Number.isFinite(weight) && weight >= 0;
}

/** Tick or un-tick a set. A set that isn't filled in properly can't be ticked. */
export function toggleDone(session: ActiveSession, exIndex: number, setIndex: number): ActiveSession {
  return editSet(session, exIndex, setIndex, (s) =>
    s.done ? { ...s, done: false } : isSetComplete(s) ? { ...s, done: true } : s
  );
}

/** Add one more set, starting with the same weight as the one before it. */
export function addSet(session: ActiveSession, exIndex: number): ActiveSession {
  return {
    ...session,
    exercises: session.exercises.map((e, i) => {
      if (i !== exIndex) return e;
      const previous = e.sets[e.sets.length - 1];
      return { ...e, sets: [...e.sets, { weight: previous?.weight ?? "", reps: "", done: false }] };
    }),
  };
}

/** Remove the last set (but always keep at least one). */
export function removeLastSet(session: ActiveSession, exIndex: number): ActiveSession {
  return {
    ...session,
    exercises: session.exercises.map((e, i) =>
      i !== exIndex || e.sets.length <= 1 ? e : { ...e, sets: e.sets.slice(0, -1) }
    ),
  };
}

export function countDoneSets(session: ActiveSession): number {
  return session.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
}

/**
 * Turn a workout in progress into a finished one. Only ticked sets are kept, and
 * exercises with no ticked sets are dropped. Returns null if nothing was done.
 */
export function finishSession(session: ActiveSession, now: Date): Session | null {
  const exercises = session.exercises
    .map((e) => ({
      exerciseId: e.exerciseId,
      repMin: e.repMin,
      repMax: e.repMax,
      targetSets: e.sets.length,
      sets: e.sets
        .filter((s) => s.done && isSetComplete(s))
        .map((s) => ({ weightKg: parseNumber(s.weight), reps: parseNumber(s.reps) })),
    }))
    .filter((e) => e.sets.length > 0);
  if (exercises.length === 0) return null;
  return {
    id: session.id,
    templateId: session.templateId,
    templateName: session.templateName,
    startedAt: session.startedAt,
    finishedAt: now.toISOString(),
    exercises,
    ...(session.readiness ? { readiness: session.readiness } : {}),
    ...(session.readiness && isReduced(session.readiness) ? { reduced: true } : {}),
  };
}

/** Total weight lifted (weight × reps, summed). A rough "how much work" number. */
export function totalVolumeKg(session: Session): number {
  return session.exercises.reduce(
    (sum, e) => sum + e.sets.reduce((s, x) => s + x.weightKg * x.reps, 0),
    0
  );
}
