import type { Exercise, Readiness, Template, TemplateExercise } from "./types";

// How the "how do you feel?" check-in changes today's workout. Rules: docs/PLAN.md ("Readiness rules v1").

export interface ReadinessOption {
  id: Readiness;
  emoji: string;
  label: string;
  /** One plain sentence telling the user what today's workout will look like. */
  blurb: string;
}

export const READINESS_OPTIONS: ReadinessOption[] = [
  { id: "strong", emoji: "🔥", label: "Strong", blurb: "Full workout as planned. Make it count." },
  { id: "good", emoji: "🙂", label: "Good", blurb: "Full workout as planned." },
  { id: "average", emoji: "😐", label: "Average", blurb: "Full workout as planned." },
  {
    id: "tired",
    emoji: "😴",
    label: "Tired",
    blurb: "Same exercises with one fewer set each, and no weight jumps. Still a real session, and it won't count against your progress.",
  },
  {
    id: "exhausted",
    emoji: "💀",
    label: "Exhausted",
    blurb: "A short “minimum effective” workout: your top big lifts only, 2 sets each, a bit lighter, about 20 minutes. Far better than skipping, and it won't count against your progress.",
  },
];

export const optionFor = (r: Readiness) => READINESS_OPTIONS.find((o) => o.id === r)!;

/** Tired and Exhausted days are "low-energy days": saved as reduced, ignored when judging progress. */
export function isReduced(readiness: Readiness): boolean {
  return readiness === "tired" || readiness === "exhausted";
}

/** One fewer set, but never below 2 (a single set isn't worth the trip), and never more than planned. */
function tiredSets(sets: number): number {
  return Math.min(sets, Math.max(2, sets - 1));
}

const MAX_EXHAUSTED_EXERCISES = 3;
const MIN_EXHAUSTED_EXERCISES = 2;

/**
 * Which exercises, and how many sets of each, to do today.
 * Normal days: the template as written. Tired: one fewer set each.
 * Exhausted: the first 2–3 big lifts (template order), 2 sets each.
 */
export function planWorkout(template: Template, exercises: Exercise[], readiness: Readiness): TemplateExercise[] {
  const list = template.exercises;
  if (readiness === "tired") return list.map((e) => ({ ...e, sets: tiredSets(e.sets) }));
  if (readiness !== "exhausted") return list;

  const isBig = (e: TemplateExercise) => exercises.find((x) => x.id === e.exerciseId)?.compound === true;
  const chosen = new Set<TemplateExercise>(list.filter(isBig).slice(0, MAX_EXHAUSTED_EXERCISES));
  // Too few big lifts in this template? Fill up with the first remaining exercises.
  for (const e of list) {
    if (chosen.size >= MIN_EXHAUSTED_EXERCISES) break;
    chosen.add(e);
  }
  return list.filter((e) => chosen.has(e)).map((e) => ({ ...e, sets: Math.min(e.sets, 2) }));
}
