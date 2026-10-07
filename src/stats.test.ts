import { describe, expect, it } from "vitest";
import { estimatedMax, exercisesWithHistory, lowEnergyCount, niceTicks, startOfWeek, strengthSeries, weeklyCounts } from "./stats";
import { freshData, normalizeData, normalizeProfile } from "./storage";
import type { Session } from "./types";

// Local-time dates so the tests pass in any time zone. 2026-10-07 is a Wednesday.
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0);
const NOW = day(2026, 10, 7);

const make = (id: string, when: Date, sets: [number, number][], opts: { reduced?: boolean; exerciseId?: string } = {}): Session => ({
  id, templateId: "a", templateName: "A", startedAt: when.toISOString(), finishedAt: when.toISOString(),
  ...(opts.reduced ? { reduced: true } : {}),
  exercises: [{ exerciseId: opts.exerciseId ?? "bench", repMin: 6, repMax: 8, targetSets: sets.length, sets: sets.map(([weightKg, reps]) => ({ weightKg, reps })) }],
});

describe("weeks", () => {
  it("start on Monday", () => {
    for (const d of [5, 6, 7, 8, 9, 10, 11]) {
      const start = startOfWeek(day(2026, 10, d));
      expect([start.getFullYear(), start.getMonth() + 1, start.getDate(), start.getHours()]).toEqual([2026, 10, 5, 0]);
    }
    expect(startOfWeek(day(2026, 10, 4)).getDate()).toBe(28); // Sunday 4 Oct belongs to the week of Mon 28 Sep
    expect(startOfWeek(day(2026, 10, 4)).getMonth()).toBe(8);
  });

  it("counts workouts per week, split into normal and low-energy, oldest first", () => {
    const sessions = [
      make("a", day(2026, 10, 5), [[60, 8]]),                 // this week (Mon)
      make("b", day(2026, 10, 7), [[60, 8]], { reduced: true }), // this week
      make("c", day(2026, 10, 4), [[60, 8]]),                 // last week (Sun)
      make("d", day(2026, 9, 1), [[60, 8]]),                  // too old for a 3-week view
    ];
    const weeks = weeklyCounts(sessions, NOW, 3);
    expect(weeks).toHaveLength(3);
    expect(weeks.map((w) => [w.normal, w.lowEnergy])).toEqual([[0, 0], [1, 0], [1, 1]]);
    expect(weeks[2]!.start.getDate()).toBe(5);
    expect(weeks[0]!.start.getTime()).toBeLessThan(weeks[2]!.start.getTime());
  });

  it("counts low-energy days, optionally within the last N days", () => {
    const sessions = [make("a", day(2026, 10, 6), [[60, 8]], { reduced: true }), make("b", day(2026, 8, 1), [[60, 8]], { reduced: true }), make("c", day(2026, 10, 1), [[60, 8]])];
    expect(lowEnergyCount(sessions, NOW)).toBe(2);
    expect(lowEnergyCount(sessions, NOW, 30)).toBe(1);
  });
});

describe("estimated best single lift", () => {
  it("combines weight and reps (Epley), one rep is just the weight", () => {
    expect(estimatedMax(100, 1)).toBe(100);
    expect(estimatedMax(80, 8)).toBe(101.3);
    expect(estimatedMax(66, 8)).toBe(83.6);
    expect(estimatedMax(0, 10)).toBe(0);
  });

  it("shows progress even when the weight stays the same", () => {
    const sessions = [make("a", day(2026, 9, 20), [[80, 6], [80, 6], [80, 5]]), make("b", day(2026, 9, 27), [[80, 8], [80, 7], [80, 6]])];
    const series = strengthSeries(sessions, "bench");
    expect(series.map((p) => p.estimatedMaxKg)).toEqual([96, 101.3]);
    expect(series[1]!.topSet).toEqual({ weightKg: 80, reps: 8 });
  });

  it("picks the best set (heavier but fewer reps can win), flags low-energy days, sorts by date, ignores other exercises", () => {
    const sessions = [
      make("late", day(2026, 10, 2), [[70, 8], [90, 3]], { reduced: true }),
      make("early", day(2026, 9, 25), [[60, 10]]),
      make("other", day(2026, 9, 26), [[100, 5]], { exerciseId: "squat" }),
    ];
    const s = strengthSeries(sessions, "bench");
    expect(s.map((p) => p.sessionId)).toEqual(["early", "late"]);
    expect(s[1]).toMatchObject({ estimatedMaxKg: 99, topSet: { weightKg: 90, reps: 3 }, lowEnergy: true });
  });

  it("lists exercises that were done, most recent first", () => {
    const sessions = [make("a", day(2026, 9, 20), [[1, 1]], { exerciseId: "squat" }), make("b", day(2026, 10, 1), [[1, 1]], { exerciseId: "bench" })];
    expect(exercisesWithHistory(sessions)).toEqual(["bench", "squat"]);
    expect(exercisesWithHistory([])).toEqual([]);
  });
});

describe("axis ticks", () => {
  it("are round numbers that cover the range", () => {
    expect(niceTicks(83, 101)).toEqual([80, 85, 90, 95, 100, 105]);
    expect(niceTicks(0, 3, 3)).toEqual([0, 1, 2, 3]);
    const t = niceTicks(96, 101.3);
    expect(t[0]).toBeLessThanOrEqual(96);
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(101.3);
  });
  it("copes with a flat line", () => {
    expect(niceTicks(80, 80)).toHaveLength(2);
  });
});

describe("profile", () => {
  it("falls back to defaults for missing or odd values", () => {
    expect(normalizeProfile(undefined)).toEqual({ name: "", goal: "muscle", sessionsPerWeek: 3 });
    expect(normalizeProfile({ name: "Sam", goal: "strength", sessionsPerWeek: 4 })).toEqual({ name: "Sam", goal: "strength", sessionsPerWeek: 4 });
    expect(normalizeProfile({ goal: "fly", sessionsPerWeek: 99 })).toMatchObject({ goal: "muscle", sessionsPerWeek: 3 });
  });
  it("older saved data gets a default profile", () => {
    const old = { version: 1, customExercises: [], templates: [], sessions: [], activeSession: null };
    expect(normalizeData(old)!.profile).toEqual({ name: "", goal: "muscle", sessionsPerWeek: 3 });
    expect(normalizeData(JSON.parse(JSON.stringify(freshData())))).toEqual(freshData());
  });
});
