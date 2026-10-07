import { describe, expect, it } from "vitest";
import { countSets, durationMinutes, newestFirst, removeSession } from "./history";
import type { Session } from "./types";

const make = (id: string, start: string, end: string, sets = 2): Session => ({
  id, templateId: "a", templateName: "A", startedAt: start, finishedAt: end,
  exercises: [{ exerciseId: "bench", repMin: 6, repMax: 8, targetSets: sets,
    sets: Array.from({ length: sets }, () => ({ weightKg: 60, reps: 8 })) }],
});

describe("history helpers", () => {
  const a = make("a", "2026-01-01T10:00:00Z", "2026-01-01T10:45:00Z", 3);
  const b = make("b", "2026-01-03T10:00:00Z", "2026-01-03T10:00:10Z");

  it("sorts newest first without changing the original", () => {
    const list = [a, b];
    expect(newestFirst(list).map((s) => s.id)).toEqual(["b", "a"]);
    expect(list.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("measures duration in minutes, never less than 1", () => {
    expect(durationMinutes(a)).toBe(45);
    expect(durationMinutes(b)).toBe(1);
  });

  it("counts sets and removes a session by id", () => {
    expect(countSets(a)).toBe(3);
    expect(removeSession([a, b], "a").map((s) => s.id)).toEqual(["b"]);
  });
});
