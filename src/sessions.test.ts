import { describe, expect, it } from "vitest";
import {
  addSet, countDoneSets, describeSets, finishSession, isSetComplete, lastPerformance,
  nextTemplate, parseNumber, removeLastSet, setField, startSession, toggleDone, totalVolumeKg,
} from "./sessions";
import { freshData, normalizeData } from "./storage";
import type { Session, Template } from "./types";

const NOW = new Date("2026-01-05T10:00:00Z");
const A: Template = { id: "a", name: "A", exercises: [{ exerciseId: "bench", sets: 3, repMin: 6, repMax: 8 }] };
const B: Template = { id: "b", name: "B", exercises: [{ exerciseId: "squat", sets: 2, repMin: 6, repMax: 8 }] };

const past = (templateId: string, exerciseId: string, sets: [number, number][]): Session => ({
  id: "x", templateId, templateName: templateId, startedAt: NOW.toISOString(), finishedAt: NOW.toISOString(),
  exercises: [{ exerciseId, repMin: 6, repMax: 8, targetSets: sets.length, sets: sets.map(([w, r]) => ({ weightKg: w, reps: r })) }],
});

describe("numbers", () => {
  it("reads decimals with a dot or a comma, rejects junk", () => {
    expect(parseNumber("66.5")).toBe(66.5);
    expect(parseNumber("66,5")).toBe(66.5);
    expect(parseNumber(" 8 ")).toBe(8);
    expect(parseNumber("")).toBeNaN();
    expect(parseNumber("abc")).toBeNaN();
  });
});

describe("last time", () => {
  const history = [past("a", "bench", [[60, 8]]), past("a", "bench", [[66, 8], [66, 7], [66, 6]])];
  it("finds the most recent sets and describes them", () => {
    expect(lastPerformance(history, "bench")).toEqual([
      { weightKg: 66, reps: 8 }, { weightKg: 66, reps: 7 }, { weightKg: 66, reps: 6 },
    ]);
    expect(lastPerformance(history, "squat")).toBeUndefined();
    expect(describeSets(lastPerformance(history, "bench")!)).toBe("66 kg: 8, 7, 6");
    expect(describeSets([{ weightKg: 66, reps: 8 }, { weightKg: 67.5, reps: 6 }])).toBe("66 kg: 8 · 67.5 kg: 6");
  });
});

describe("which workout is next", () => {
  it("starts with the first, then rotates and loops", () => {
    expect(nextTemplate([A, B], [])?.id).toBe("a");
    expect(nextTemplate([A, B], [past("a", "bench", [[60, 8]])])?.id).toBe("b");
    expect(nextTemplate([A, B], [past("b", "squat", [[60, 8]])])?.id).toBe("a");
    expect(nextTemplate([], [])).toBeUndefined();
  });
});

describe("running a workout", () => {
  it("starts with last time's weights and empty reps", () => {
    const s = startSession(A, [past("a", "bench", [[66, 8], [66, 7]])], NOW);
    expect(s.exercises[0]!.sets.map((x) => x.weight)).toEqual(["66", "66", "66"]);
    expect(s.exercises[0]!.sets.every((x) => x.reps === "" && !x.done)).toBe(true);
    expect(startSession(A, [], NOW).exercises[0]!.sets[0]!.weight).toBe("");
  });

  it("only ticks complete sets, and editing un-ticks", () => {
    let s = startSession(A, [], NOW);
    expect(toggleDone(s, 0, 0).exercises[0]!.sets[0]!.done).toBe(false); // empty: refused
    s = setField(setField(s, 0, 0, "weight", "66,5"), 0, 0, "reps", "8");
    expect(isSetComplete(s.exercises[0]!.sets[0]!)).toBe(true);
    s = toggleDone(s, 0, 0);
    expect(s.exercises[0]!.sets[0]!.done).toBe(true);
    expect(setField(s, 0, 0, "reps", "9").exercises[0]!.sets[0]!.done).toBe(false);
    expect(isSetComplete({ weight: "60", reps: "7.5", done: false })).toBe(false);
    expect(isSetComplete({ weight: "-5", reps: "7", done: false })).toBe(false);
    expect(isSetComplete({ weight: "0", reps: "7", done: false })).toBe(true); // bodyweight
  });

  it("adds sets copying the weight and removes the last, keeping at least one", () => {
    let s = startSession(A, [past("a", "bench", [[66, 8]])], NOW);
    s = addSet(s, 0);
    expect(s.exercises[0]!.sets).toHaveLength(4);
    expect(s.exercises[0]!.sets[3]!.weight).toBe("66");
    s = removeLastSet(removeLastSet(removeLastSet(removeLastSet(s, 0), 0), 0), 0);
    expect(s.exercises[0]!.sets).toHaveLength(1);
  });

  it("finishing keeps only ticked sets and drops empty exercises", () => {
    const two: Template = { ...A, exercises: [...A.exercises, { exerciseId: "row", sets: 2, repMin: 8, repMax: 10 }] };
    let s = startSession(two, [], NOW);
    s = setField(setField(s, 0, 0, "weight", "66"), 0, 0, "reps", "8");
    s = toggleDone(s, 0, 0);
    s = setField(setField(s, 0, 1, "weight", "66"), 0, 1, "reps", "7"); // typed but not ticked
    expect(countDoneSets(s)).toBe(1);
    const done = finishSession(s, NOW)!;
    expect(done.exercises).toHaveLength(1);
    expect(done.exercises[0]).toMatchObject({ exerciseId: "bench", targetSets: 3, sets: [{ weightKg: 66, reps: 8 }] });
    expect(totalVolumeKg(done)).toBe(528);
    expect(finishSession(startSession(A, [], NOW), NOW)).toBeNull();
  });

  it("never changes the original", () => {
    const s = startSession(A, [], NOW);
    const copy = structuredClone(s);
    setField(s, 0, 0, "reps", "5"); addSet(s, 0); removeLastSet(s, 0); toggleDone(s, 0, 0);
    expect(s).toEqual(copy);
  });
});

describe("saved data from older versions", () => {
  it("upgrades Milestone 1 data (no sessions) and rejects junk", () => {
    const old = { version: 1, customExercises: [], templates: [A] };
    const up = normalizeData(old)!;
    expect(up.sessions).toEqual([]);
    expect(up.activeSession).toBeNull();
    expect(up.templates).toEqual([A]);
    expect(normalizeData(null)).toBeNull();
    expect(normalizeData({ version: 2 })).toBeNull();
    expect(normalizeData(JSON.parse(JSON.stringify(freshData())))).toEqual(freshData());
  });
});
