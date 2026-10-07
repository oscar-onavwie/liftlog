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

export type Readiness = "strong" | "good" | "average" | "tired" | "exhausted";

// ---- A workout in progress ("draft") -------------------------------------------------
// While you are typing, weight and reps are kept as text so that things like "66." work.

export interface DraftSet {
  weight: string;
  reps: string;
  done: boolean;
}

/** What the app suggested for this exercise when the workout started. */
export interface Recommendation {
  kind: "first-time" | "increase" | "build" | "hold" | "reduce" | "return";
  /** null when there is no history to base a weight on. */
  weightKg: number | null;
  /** Reps to aim for on every set. */
  targetReps: number;
  /** One plain-English sentence explaining why. */
  message: string;
}

export interface DraftExercise {
  exerciseId: string;
  repMin: number;
  repMax: number;
  sets: DraftSet[];
  recommendation?: Recommendation;
}

export interface ActiveSession {
  id: string;
  templateId: string;
  templateName: string;
  startedAt: string; // ISO date-time
  exercises: DraftExercise[];
  /** How the user said they felt when starting. Missing on workouts started by older app versions. */
  readiness?: Readiness;
}

// ---- A finished workout (saved in history) ------------------------------------------

export interface LoggedSet {
  weightKg: number;
  reps: number;
}

export interface SessionExercise {
  exerciseId: string;
  repMin: number;
  repMax: number;
  /** How many sets the template asked for (you may have done more or fewer). */
  targetSets: number;
  sets: LoggedSet[];
}

export interface Session {
  id: string;
  templateId: string;
  templateName: string;
  startedAt: string;
  finishedAt: string;
  exercises: SessionExercise[];
  /** How the user said they felt when starting. */
  readiness?: Readiness;
  /** True for a deliberately lighter workout (low-energy day). Ignored when judging progress. */
  reduced?: boolean;
}

export type Goal = "muscle" | "strength" | "consistency";

export interface Profile {
  name: string;
  goal: Goal;
  /** How many workouts per week the user is aiming for. */
  sessionsPerWeek: number;
}

/** Everything the app saves on the phone. */
export interface AppData {
  version: 1;
  customExercises: Exercise[];
  templates: Template[];
  /** Finished workouts, oldest first. */
  sessions: Session[];
  /** The workout you are in the middle of, if any. */
  activeSession: ActiveSession | null;
  profile: Profile;
}
