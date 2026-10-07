import type { Equipment, Exercise, Muscle } from "../types";

function ex(
  id: string,
  name: string,
  muscle: Muscle,
  equipment: Equipment,
  compound: boolean,
  stepKg: number
): Exercise {
  return { id, name, muscle, equipment, compound, stepKg };
}

export const BUILT_IN_EXERCISES: Exercise[] = [
  // chest
  ex("bench-press", "Barbell Bench Press", "chest", "barbell", true, 2.5),
  ex("incline-db-press", "Incline Dumbbell Press", "chest", "dumbbell", true, 2),
  ex("machine-chest-press", "Machine Chest Press", "chest", "machine", true, 5),
  ex("cable-fly", "Cable Fly", "chest", "cable", false, 2.5),
  // back
  ex("barbell-row", "Barbell Row", "back", "barbell", true, 2.5),
  ex("lat-pulldown", "Lat Pulldown", "back", "cable", true, 2.5),
  ex("seated-cable-row", "Seated Cable Row", "back", "cable", true, 2.5),
  ex("pull-up", "Pull-Up (add weight)", "back", "bodyweight", true, 2.5),
  ex("db-row", "One-Arm Dumbbell Row", "back", "dumbbell", true, 2),
  ex("deadlift", "Deadlift", "back", "barbell", true, 5),
  // shoulders
  ex("overhead-press", "Overhead Press", "shoulders", "barbell", true, 2.5),
  ex("db-shoulder-press", "Dumbbell Shoulder Press", "shoulders", "dumbbell", true, 2),
  ex("lateral-raise", "Lateral Raise", "shoulders", "dumbbell", false, 1),
  ex("face-pull", "Face Pull", "shoulders", "cable", false, 2.5),
  ex("rear-delt-fly", "Rear Delt Fly", "shoulders", "dumbbell", false, 1),
  // legs
  ex("back-squat", "Barbell Back Squat", "legs", "barbell", true, 2.5),
  ex("goblet-squat", "Goblet Squat", "legs", "dumbbell", true, 2),
  ex("leg-press", "Leg Press", "legs", "machine", true, 5),
  ex("romanian-deadlift", "Romanian Deadlift", "legs", "barbell", true, 5),
  ex("split-squat", "Bulgarian Split Squat", "legs", "dumbbell", true, 2),
  ex("hip-thrust", "Hip Thrust", "legs", "barbell", true, 5),
  ex("leg-extension", "Leg Extension", "legs", "machine", false, 2.5),
  ex("leg-curl", "Leg Curl", "legs", "machine", false, 2.5),
  ex("calf-raise", "Standing Calf Raise", "legs", "machine", false, 5),
  // arms
  ex("barbell-curl", "Barbell Curl", "arms", "barbell", false, 2.5),
  ex("db-curl", "Dumbbell Curl", "arms", "dumbbell", false, 1),
  ex("hammer-curl", "Hammer Curl", "arms", "dumbbell", false, 1),
  ex("triceps-pushdown", "Triceps Pushdown", "arms", "cable", false, 2.5),
  ex("overhead-triceps", "Overhead Triceps Extension", "arms", "cable", false, 2.5),
  // core
  ex("cable-crunch", "Cable Crunch", "core", "cable", false, 2.5),
];

export const MUSCLE_ORDER: Muscle[] = ["chest", "back", "shoulders", "legs", "arms", "core"];
