import type { Template } from "../types";

// Compound lifts first, small lifts last. (On a low-energy day the app will keep the first few.)
export const STARTER_TEMPLATES: Template[] = [
  {
    id: "full-body-a",
    name: "Full Body A",
    exercises: [
      { exerciseId: "back-squat", sets: 3, repMin: 6, repMax: 8 },
      { exerciseId: "bench-press", sets: 3, repMin: 6, repMax: 8 },
      { exerciseId: "barbell-row", sets: 3, repMin: 8, repMax: 10 },
      { exerciseId: "leg-curl", sets: 2, repMin: 10, repMax: 12 },
      { exerciseId: "triceps-pushdown", sets: 2, repMin: 10, repMax: 12 },
    ],
  },
  {
    id: "full-body-b",
    name: "Full Body B",
    exercises: [
      { exerciseId: "romanian-deadlift", sets: 3, repMin: 6, repMax: 8 },
      { exerciseId: "overhead-press", sets: 3, repMin: 6, repMax: 8 },
      { exerciseId: "lat-pulldown", sets: 3, repMin: 8, repMax: 10 },
      { exerciseId: "leg-press", sets: 3, repMin: 8, repMax: 10 },
      { exerciseId: "db-curl", sets: 2, repMin: 10, repMax: 12 },
      { exerciseId: "lateral-raise", sets: 2, repMin: 12, repMax: 15 },
    ],
  },
];
