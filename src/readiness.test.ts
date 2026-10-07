import { describe, expect, it } from "vitest";
import { BUILT_IN_EXERCISES } from "./data/exercises";
import { STARTER_TEMPLATES } from "./data/starterTemplates";
import { recommend } from "./progression";
import { isReduced, planWorkout } from "./readiness";
import { finishSession, setField, startSession, toggleDone } from "./sessions";
import type { Session, Template } from "./types";

const NOW = new Date("2026-03-30T12:00:00Z");
const [FULL_A, FULL_B] = STARTER_TEMPLATES as [Template, Template];
const names = (t: ReturnType<typeof planWorkout>) => t.map((e) => e.exerciseId);

describe("which days are low-energy", () => {
  it("only Tired and Exhausted", () => {
    expect(["strong", "good", "average"].map((r) => isReduced(r as never))).toEqual([false, false, false]);
    expect(isReduced("tired")).toBe(true);
    expect(isReduced("exhausted")).toBe(true);
  });
});

describe("shaping today's workout", () => {
  it("Strong / Good / Average: the template exactly as written", () => {
    for (const r of ["strong", "good", "average"] as const)
      expect(planWorkout(FULL_A, BUILT_IN_EXERCISES, r)).toEqual(FULL_A.exercises);
  });

  it("Tired: same exercises, one fewer set each (never below 2, never more than planned)", () => {
    const plan = planWorkout(FULL_A, BUILT_IN_EXERCISES, "tired");
    expect(names(plan)).toEqual(names(FULL_A.exercises));
    expect(plan.map((e) => e.sets)).toEqual([2, 2, 2, 2, 2]); // 3,3,3,2,2 → 2,2,2,2,2
    expect(planWorkout({ ...FULL_A, exercises: [{ exerciseId: "back-squat", sets: 5, repMin: 5, repMax: 5 }] }, BUILT_IN_EXERCISES, "tired")[0]!.sets).toBe(4);
    expect(planWorkout({ ...FULL_A, exercises: [{ exerciseId: "back-squat", sets: 1, repMin: 5, repMax: 5 }] }, BUILT_IN_EXERCISES, "tired")[0]!.sets).toBe(1);
  });

  it("Exhausted: only the first three big lifts, 2 sets each, in template order", () => {
    const plan = planWorkout(FULL_A, BUILT_IN_EXERCISES, "exhausted");
    expect(names(plan)).toEqual(["back-squat", "bench-press", "barbell-row"]);
    expect(plan.every((e) => e.sets === 2)).toBe(true);
    const b = planWorkout(FULL_B, BUILT_IN_EXERCISES, "exhausted");
    expect(names(b)).toEqual(["romanian-deadlift", "overhead-press", "lat-pulldown"]); // leg press (4th big lift) is dropped
  });

  it("Exhausted with fewer than 2 big lifts: tops up with the first other exercises", () => {
    const arms: Template = { id: "x", name: "Arms", exercises: [
      { exerciseId: "db-curl", sets: 3, repMin: 10, repMax: 12 },
      { exerciseId: "bench-press", sets: 3, repMin: 6, repMax: 8 },
      { exerciseId: "triceps-pushdown", sets: 3, repMin: 10, repMax: 12 },
    ] };
    expect(names(planWorkout(arms, BUILT_IN_EXERCISES, "exhausted"))).toEqual(["db-curl", "bench-press"]);
    const allSmall: Template = { id: "y", name: "Small", exercises: arms.exercises.filter((e) => e.exerciseId !== "bench-press") };
    expect(names(planWorkout(allSmall, BUILT_IN_EXERCISES, "exhausted"))).toEqual(["db-curl", "triceps-pushdown"]);
  });

  it("Exhausted never invents sets: a 1-set exercise stays at 1; the original template is untouched", () => {
    const copy = structuredClone(FULL_A);
    planWorkout(FULL_A, BUILT_IN_EXERCISES, "exhausted"); planWorkout(FULL_A, BUILT_IN_EXERCISES, "tired");
    expect(FULL_A).toEqual(copy);
    const one: Template = { id: "z", name: "One", exercises: [{ exerciseId: "back-squat", sets: 1, repMin: 5, repMax: 5 }, { exerciseId: "bench-press", sets: 3, repMin: 5, repMax: 5 }] };
    expect(planWorkout(one, BUILT_IN_EXERCISES, "exhausted").map((e) => e.sets)).toEqual([1, 2]);
  });
});

/** A finished normal squat session: 3 sets at 80 kg. */
const past = (reps: number[], daysBack = 3, reduced = false): Session => ({
  id: `p${daysBack}`, templateId: "full-body-a", templateName: "Full Body A",
  startedAt: new Date(NOW.getTime() - daysBack * 86400000).toISOString(),
  finishedAt: new Date(NOW.getTime() - daysBack * 86400000).toISOString(),
  ...(reduced ? { reduced: true } : {}),
  exercises: [{ exerciseId: "back-squat", repMin: 6, repMax: 8, targetSets: 3, sets: reps.map((r) => ({ weightKg: 80, reps: r })) }],
});

describe("easy-day recommendations", () => {
  const base = { exerciseId: "back-squat", stepKg: 2.5, sets: 3, repMin: 6, repMax: 8, now: NOW };
  it("never go up, even after hitting the top of the range", () => {
    const r = recommend({ ...base, sessions: [past([8, 8, 8])], easyDay: true });
    expect(r).toMatchObject({ kind: "build", weightKg: 80, targetReps: 8 });
    expect(recommend({ ...base, sessions: [past([8, 8, 8])] }).weightKg).toBe(82.5); // normal day does
  });
  it("just match last time instead of asking for one more rep", () => {
    expect(recommend({ ...base, sessions: [past([7, 7, 7])], easyDay: true }).targetReps).toBe(7);
    expect(recommend({ ...base, sessions: [past([7, 7, 7])] }).targetReps).toBe(8);
  });
});

describe("starting a workout by readiness", () => {
  const sessions = [past([8, 8, 8])]; // normally → 82.5 kg next
  const start = (r: Parameters<typeof startSession>[4]) => startSession(FULL_A, sessions, BUILT_IN_EXERCISES, NOW, r);

  it("Good: normal recommendation (82.5 kg), full template", () => {
    const s = start("good");
    expect(s.exercises).toHaveLength(5);
    expect(s.exercises[0]!.recommendation!.weightKg).toBe(82.5);
    expect(s.readiness).toBe("good");
  });
  it("Tired: 80 kg (no jump), 2 sets", () => {
    const s = start("tired");
    expect(s.exercises[0]!.sets).toHaveLength(2);
    expect(s.exercises[0]!.sets[0]!.weight).toBe("80");
  });
  it("Exhausted: 3 exercises, 2 sets, about 10% lighter (80 → 72.5), a clear message", () => {
    const s = start("exhausted");
    expect(s.exercises).toHaveLength(3);
    expect(s.exercises[0]!.sets).toHaveLength(2);
    expect(s.exercises[0]!.sets[0]!.weight).toBe("72.5");
    expect(s.exercises[0]!.recommendation!.message).toContain("Exhausted day");
    expect(s.exercises[1]!.sets[0]!.weight).toBe(""); // never done bench → still your choice
  });
});

describe("a low-energy session never hurts your progress", () => {
  function finishAs(readiness: Parameters<typeof startSession>[4], weight: string, reps: string): Session {
    let s = startSession(FULL_A, [], BUILT_IN_EXERCISES, NOW, readiness);
    s = setField(setField(s, 0, 0, "weight", weight), 0, 0, "reps", reps);
    return finishSession(toggleDone(s, 0, 0), NOW)!;
  }
  it("Tired/Exhausted sessions are saved as reduced with the readiness; others are not", () => {
    expect(finishAs("tired", "60", "5")).toMatchObject({ reduced: true, readiness: "tired" });
    expect(finishAs("exhausted", "60", "5")).toMatchObject({ reduced: true, readiness: "exhausted" });
    const normal = finishAs("good", "60", "5");
    expect(normal.reduced).toBeUndefined();
    expect(normal.readiness).toBe("good");
  });

  it("the story: normal session, then an exhausted day with weak numbers → next plan is unaffected", () => {
    const normal = past([8, 7, 6], 7);
    const exhausted = { ...finishAs("exhausted", "65", "4"), startedAt: NOW.toISOString(), finishedAt: NOW.toISOString() };
    const next = recommend({ exerciseId: "back-squat", stepKg: 2.5, sets: 3, repMin: 6, repMax: 8, sessions: [normal, exhausted], now: new Date(NOW.getTime() + 2 * 86400000) });
    expect(next).toMatchObject({ kind: "build", weightKg: 80, targetReps: 8 }); // same as if the bad day never happened
  });

  it("two exhausted days in a row (4 reps each) never cause a drop", () => {
    const sessions = [past([8, 7, 6], 9), past([4, 4], 5, true), past([4, 3], 2, true)];
    expect(recommend({ exerciseId: "back-squat", stepKg: 2.5, sets: 3, repMin: 6, repMax: 8, sessions, now: NOW }).kind).toBe("build");
  });
});
