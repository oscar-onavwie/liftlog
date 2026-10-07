import type { Exercise, Template, TemplateExercise } from "./types";

// Plain helper functions for editing templates. They never change the template
// you pass in; they return a new, edited copy (this keeps the screens simple and bug-free).

export const LIMITS = { minSets: 1, maxSets: 10, minReps: 1, maxReps: 30 };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Sensible starting numbers for an exercise that was just added to a template. */
export function defaultsFor(exercise: Exercise): Omit<TemplateExercise, "exerciseId"> {
  return exercise.compound
    ? { sets: 3, repMin: 6, repMax: 8 }
    : { sets: 3, repMin: 10, repMax: 12 };
}

export function addExercise(template: Template, exercise: Exercise): Template {
  const entry: TemplateExercise = { exerciseId: exercise.id, ...defaultsFor(exercise) };
  return { ...template, exercises: [...template.exercises, entry] };
}

export function removeExercise(template: Template, index: number): Template {
  return { ...template, exercises: template.exercises.filter((_, i) => i !== index) };
}

/** direction -1 = up, +1 = down. Does nothing at the ends of the list. */
export function moveExercise(template: Template, index: number, direction: -1 | 1): Template {
  const target = index + direction;
  if (target < 0 || target >= template.exercises.length) return template;
  const list = [...template.exercises];
  [list[index], list[target]] = [list[target]!, list[index]!];
  return { ...template, exercises: list };
}

/** Change sets / repMin / repMax while keeping them in a valid range (repMax is never below repMin). */
export function updateExercise(
  template: Template,
  index: number,
  change: Partial<Pick<TemplateExercise, "sets" | "repMin" | "repMax">>
): Template {
  const list = template.exercises.map((e, i) => {
    if (i !== index) return e;
    const sets = clamp(change.sets ?? e.sets, LIMITS.minSets, LIMITS.maxSets);
    let repMin = clamp(change.repMin ?? e.repMin, LIMITS.minReps, LIMITS.maxReps);
    let repMax = clamp(change.repMax ?? e.repMax, LIMITS.minReps, LIMITS.maxReps);
    if (repMax < repMin) {
      // Whichever number the user just changed wins; the other follows.
      if (change.repMin !== undefined) repMax = repMin;
      else repMin = repMax;
    }
    return { ...e, sets, repMin, repMax };
  });
  return { ...template, exercises: list };
}

export function newTemplate(name: string): Template {
  return { id: `t-${Date.now().toString(36)}`, name: name.trim() || "New workout", exercises: [] };
}
