import { describe, expect, it } from "vitest";
import { BUILT_IN_EXERCISES } from "./data/exercises";
import { STARTER_TEMPLATES } from "./data/starterTemplates";
import { addExercise, moveExercise, removeExercise, updateExercise } from "./templates";
import type { Template } from "./types";

const base: Template = {
  id: "t",
  name: "T",
  exercises: [
    { exerciseId: "a", sets: 3, repMin: 6, repMax: 8 },
    { exerciseId: "b", sets: 2, repMin: 10, repMax: 12 },
  ],
};

describe("starter data", () => {
  it("only uses exercises that exist, with no duplicate ids", () => {
    const ids = new Set(BUILT_IN_EXERCISES.map((e) => e.id));
    expect(ids.size).toBe(BUILT_IN_EXERCISES.length);
    for (const t of STARTER_TEMPLATES)
      for (const e of t.exercises) expect(ids.has(e.exerciseId)).toBe(true);
  });
});

describe("template editing", () => {
  it("adds exercises with sensible defaults (big lifts: 3x6-8, small: 3x10-12)", () => {
    const squat = BUILT_IN_EXERCISES.find((e) => e.id === "back-squat")!;
    const curl = BUILT_IN_EXERCISES.find((e) => e.id === "db-curl")!;
    expect(addExercise(base, squat).exercises[2]).toEqual({ exerciseId: "back-squat", sets: 3, repMin: 6, repMax: 8 });
    expect(addExercise(base, curl).exercises[2]).toEqual({ exerciseId: "db-curl", sets: 3, repMin: 10, repMax: 12 });
  });

  it("removes and moves exercises, ignoring moves past the ends", () => {
    expect(removeExercise(base, 0).exercises.map((e) => e.exerciseId)).toEqual(["b"]);
    expect(moveExercise(base, 1, -1).exercises.map((e) => e.exerciseId)).toEqual(["b", "a"]);
    expect(moveExercise(base, 0, -1)).toBe(base);
    expect(moveExercise(base, 1, 1)).toBe(base);
  });

  it("keeps sets and reps in range and repMax >= repMin", () => {
    expect(updateExercise(base, 0, { sets: 0 }).exercises[0]!.sets).toBe(1);
    expect(updateExercise(base, 0, { sets: 99 }).exercises[0]!.sets).toBe(10);
    const raised = updateExercise(base, 0, { repMin: 10 }).exercises[0]!;
    expect([raised.repMin, raised.repMax]).toEqual([10, 10]);
    const lowered = updateExercise(base, 0, { repMax: 4 }).exercises[0]!;
    expect([lowered.repMin, lowered.repMax]).toEqual([4, 4]);
  });

  it("never changes the original template", () => {
    const copy = structuredClone(base);
    updateExercise(base, 0, { sets: 5 });
    removeExercise(base, 0);
    expect(base).toEqual(copy);
  });
});
