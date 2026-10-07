import { describe, expect, it } from "vitest";
import { recommend } from "./progression";
import type { Session } from "./types";

const NOW = new Date("2026-03-30T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86400000).toISOString();

/** Build a finished workout with one exercise. sets are [kg, reps] pairs. */
function session(daysBack: number, sets: [number, number][], reduced = false, exerciseId = "bench"): Session {
  return {
    id: `s${daysBack}-${Math.random()}`, templateId: "a", templateName: "A",
    startedAt: daysAgo(daysBack), finishedAt: daysAgo(daysBack), reduced,
    exercises: [{ exerciseId, repMin: 6, repMax: 8, targetSets: sets.length, sets: sets.map(([weightKg, reps]) => ({ weightKg, reps })) }],
  };
}

const rec = (sessions: Session[], over: Partial<Parameters<typeof recommend>[0]> = {}) =>
  recommend({ exerciseId: "bench", stepKg: 2.5, sets: 3, repMin: 6, repMax: 8, sessions, now: NOW, ...over });

describe("first time", () => {
  it("has no weight to suggest", () => {
    const r = rec([]);
    expect(r.kind).toBe("first-time");
    expect(r.weightKg).toBeNull();
  });
  it("ignores other exercises", () => {
    expect(rec([session(3, [[100, 8]], false, "squat")]).kind).toBe("first-time");
  });
});

describe("normal progress", () => {
  it("the owner's example: 66 kg 8,7,6 → same weight, aim for 8,8,8", () => {
    const r = rec([session(3, [[66, 8], [66, 7], [66, 6]])]);
    expect(r).toMatchObject({ kind: "build", weightKg: 66, targetReps: 8 });
  });
  it("hitting the top on every set adds one step and resets reps to the bottom", () => {
    const r = rec([session(3, [[66, 8], [66, 8], [66, 8]])]);
    expect(r).toMatchObject({ kind: "increase", weightKg: 68.5, targetReps: 6 });
  });
  it("beating the top (e.g. 10s) still adds just one step", () => {
    expect(rec([session(3, [[66, 10], [66, 9], [66, 8]])]).weightKg).toBe(68.5);
  });
  it("all sets equal but below the top → aim one rep higher", () => {
    expect(rec([session(3, [[66, 7], [66, 7], [66, 7]])])).toMatchObject({ kind: "build", targetReps: 8 });
    expect(rec([session(3, [[66, 6], [66, 6], [66, 6]])])).toMatchObject({ kind: "build", targetReps: 7 });
  });
  it("never targets above the top of the range", () => {
    expect(rec([session(3, [[66, 8], [66, 8]])]).targetReps).toBe(8); // only 2 of 3 sets done
  });
  it("doing fewer sets than planned blocks the increase and says to finish them", () => {
    const r = rec([session(3, [[66, 8], [66, 8]])]);
    expect(r.kind).toBe("build");
    expect(r.weightKg).toBe(66);
    expect(r.message).toContain("Do all 3 sets");
  });
  it("uses this exercise's own step size", () => {
    expect(rec([session(3, [[20, 8], [20, 8], [20, 8]])], { stepKg: 1 }).weightKg).toBe(21);
    expect(rec([session(3, [[100, 8], [100, 8], [100, 8]])], { stepKg: 5 }).weightKg).toBe(105);
  });
  it("ignores lighter warm-up/drop sets when judging the working weight", () => {
    const r = rec([session(3, [[40, 10], [66, 8], [66, 8], [66, 8]])]);
    expect(r).toMatchObject({ kind: "increase", weightKg: 68.5 });
  });
  it("uses only the most recent session", () => {
    const r = rec([session(10, [[60, 8], [60, 8], [60, 8]]), session(3, [[62.5, 7], [62.5, 6], [62.5, 6]])]);
    expect(r).toMatchObject({ weightKg: 62.5, targetReps: 7 });
  });
});

describe("struggling", () => {
  it("one tough session: hold the weight, aim for the bottom of the range", () => {
    const r = rec([session(3, [[66, 6], [66, 5], [66, 4]])]);
    expect(r).toMatchObject({ kind: "hold", weightKg: 66, targetReps: 6 });
  });
  it("a tough session right after an increase is only a hold", () => {
    const r = rec([session(10, [[66, 8], [66, 8], [66, 8]]), session(3, [[68.5, 5], [68.5, 5], [68.5, 4]])]);
    expect(r).toMatchObject({ kind: "hold", weightKg: 68.5 });
  });
  it("two tough sessions in a row at the same weight: drop about 5%", () => {
    const r = rec([session(10, [[100, 5], [100, 5], [100, 4]]), session(3, [[100, 5], [100, 4], [100, 4]])]);
    expect(r).toMatchObject({ kind: "reduce", weightKg: 95, targetReps: 7 });
  });
  it("a drop is always at least one step lighter", () => {
    const r = rec([session(10, [[20, 5], [20, 5], [20, 4]]), session(3, [[20, 5], [20, 4], [20, 4]])], { stepKg: 2.5 });
    expect(r.weightKg).toBe(17.5); // 5% of 20 rounds back to 20, so we force one step
  });
  it("after a drop the old tough sessions don't trigger another drop", () => {
    const r = rec([
      session(17, [[100, 5], [100, 5], [100, 4]]), session(10, [[100, 5], [100, 4], [100, 4]]),
      session(3, [[95, 6], [95, 6], [95, 5]]),
    ]);
    expect(r.kind).toBe("hold"); // 5 reps < 6 at the new weight: first tough session there
    expect(r.weightKg).toBe(95);
  });
});

describe("time away", () => {
  it("up to 14 days: no change to the plan", () => {
    expect(rec([session(14, [[66, 8], [66, 8], [66, 8]])]).kind).toBe("increase");
  });
  it("15–28 days: ease back about 5%, no increase", () => {
    const r = rec([session(20, [[100, 8], [100, 8], [100, 8]])]);
    expect(r).toMatchObject({ kind: "return", weightKg: 95 });
    expect(r.message).toContain("20 days");
  });
  it("over 28 days: ease back about 10%", () => {
    expect(rec([session(40, [[100, 8], [100, 8], [100, 8]])])).toMatchObject({ kind: "return", weightKg: 90 });
  });
  it("keeps the rep goal modest: your last best reps within the range", () => {
    expect(rec([session(20, [[100, 7], [100, 6], [100, 6]])]).targetReps).toBe(7);
  });
});

describe("low-energy ('reduced') sessions", () => {
  it("are ignored when judging: the plan is based on your last normal session", () => {
    const r = rec([session(6, [[66, 8], [66, 7], [66, 6]]), session(2, [[60, 5], [60, 5]], true)]);
    expect(r).toMatchObject({ kind: "build", weightKg: 66, targetReps: 8 });
  });
  it("never trigger an increase", () => {
    const r = rec([session(6, [[66, 7], [66, 7], [66, 7]]), session(2, [[66, 8], [66, 8], [66, 8]], true)]);
    expect(r.kind).toBe("build");
    expect(r.weightKg).toBe(66);
  });
  it("never count as a tough session towards a drop", () => {
    const r = rec([session(9, [[100, 5], [100, 4], [100, 4]]), session(2, [[100, 4], [100, 3], [100, 3]], true)]);
    expect(r.kind).toBe("hold");
  });
  it("only low-energy history means there is nothing to judge yet", () => {
    expect(rec([session(2, [[60, 8]], true)]).kind).toBe("first-time");
  });
});
