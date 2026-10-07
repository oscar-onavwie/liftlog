export type Muscle = "chest" | "back" | "shoulders" | "legs" | "arms" | "core";
export type Equipment = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight";

export interface Exercise {
  id: string;
  name: string;
  muscle: Muscle;
  equipment: Equipment;
  /** Big multi-joint lift (squat, bench...) as opposed to a small "isolation" lift (curl, raise...). */
  compound: boolean;
  /** Smallest sensible weight jump in kg. Used later by the progression rules. */
  stepKg: number;
  custom?: boolean;
}

/** One exercise inside a workout template, e.g. "Bench Press: 3 sets of 6-8 reps". */
export interface TemplateExercise {
  exerciseId: string;
  sets: number;
  repMin: number;
  repMax: number;
}

export interface Template {
  id: string;
  name: string;
  exercises: TemplateExercise[];
}

/** Everything the app saves on the phone. */
export interface AppData {
  version: 1;
  customExercises: Exercise[];
  templates: Template[];
}
