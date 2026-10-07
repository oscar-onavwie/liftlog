import { describe, expect, it } from "vitest";
import { backupFileName, backupIsDue, buildBackup, clearHistory, daysSinceBackup, describeData, parseBackup } from "./backup";
import { freshData } from "./storage";
import type { AppData, Session } from "./types";

const NOW = new Date(2026, 9, 7, 12, 0, 0);
const session = (id: string): Session => ({
  id, templateId: "full-body-a", templateName: "Full Body A", startedAt: NOW.toISOString(), finishedAt: NOW.toISOString(),
  readiness: "tired", reduced: true,
  exercises: [{ exerciseId: "bench-press", repMin: 6, repMax: 8, targetSets: 3, sets: [{ weightKg: 66.5, reps: 8 }] }],
});
const sample = (): AppData => ({
  ...freshData(),
  profile: { name: "Sam", goal: "strength", sessionsPerWeek: 4 },
  sessions: [session("a"), session("b"), session("c")],
  customExercises: [{ id: "custom-x", name: "Hack Squat", muscle: "legs", equipment: "machine", compound: true, stepKg: 2.5, custom: true }],
  activeSession: { id: "act", templateId: "full-body-a", templateName: "Full Body A", startedAt: NOW.toISOString(), readiness: "good",
    exercises: [{ exerciseId: "back-squat", repMin: 6, repMax: 8, sets: [{ weight: "80", reps: "", done: false }] }] },
});

describe("saving and restoring", () => {
  it("round-trips everything exactly, and marks the data as backed up", () => {
    const original = sample();
    const { text, stamped } = buildBackup(original, NOW);
    const result = parseBackup(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual(stamped);
    expect(result.data.lastBackupAt).toBe(NOW.toISOString());
    expect({ ...result.data, lastBackupAt: undefined }).toEqual({ ...original, lastBackupAt: undefined });
    expect(result.exportedAt).toBe(NOW.toISOString());
  });

  it("names the file by date", () => {
    expect(backupFileName(NOW)).toBe("liftlog-backup-2026-10-07.json");
    expect(backupFileName(new Date(2026, 0, 3))).toBe("liftlog-backup-2026-01-03.json");
  });

  it("does not change the data it was given", () => {
    const original = sample();
    const copy = structuredClone(original);
    buildBackup(original, NOW);
    expect(original).toEqual(copy);
  });
});

describe("rejecting bad files, with a reason, never throwing", () => {
  const good = () => JSON.parse(buildBackup(sample(), NOW).text);
  const reject = (value: unknown) => parseBackup(typeof value === "string" ? value : JSON.stringify(value));

  it("not JSON / not ours / newer version / no data", () => {
    expect(reject("hello {").ok).toBe(false);
    expect(reject("hello {")).toMatchObject({ error: expect.stringContaining("couldn't be read") });
    expect(reject([1, 2])).toMatchObject({ ok: false });
    expect(reject({ app: "other", data: {} })).toMatchObject({ error: expect.stringContaining("isn't a LiftLog backup") });
    expect(reject({ ...good(), formatVersion: 2 })).toMatchObject({ error: expect.stringContaining("newer version") });
    expect(reject({ app: "liftlog", formatVersion: 1, data: { version: 1 } })).toMatchObject({ ok: false });
    expect(reject({ app: "liftlog", formatVersion: 1 })).toMatchObject({ ok: false });
    expect(parseBackup("x".repeat(6 * 1024 * 1024)).ok).toBe(false);
  });

  it("damaged workouts, sets, templates, custom exercises and in-progress workout", () => {
    const damage = (edit: (f: ReturnType<typeof good>) => void) => { const f = good(); edit(f); return reject(f); };
    expect(damage((f) => { f.data.sessions[1].exercises = "oops"; })).toMatchObject({ ok: false, error: expect.stringContaining("Logged workout #2") });
    expect(damage((f) => { f.data.sessions[0].exercises[0].sets[0].reps = -3; })).toMatchObject({ ok: false, error: expect.stringContaining("damaged set") });
    expect(damage((f) => { f.data.sessions[0].exercises[0].sets[0].weightKg = "heavy"; })).toMatchObject({ ok: false });
    expect(damage((f) => { f.data.sessions[0].startedAt = "not a date"; })).toMatchObject({ ok: false });
    expect(damage((f) => { f.data.templates[0].exercises[0].sets = 0; })).toMatchObject({ ok: false, error: expect.stringContaining("Full Body A") });
    expect(damage((f) => { f.data.customExercises[0].muscle = "toes"; })).toMatchObject({ ok: false, error: expect.stringContaining("Custom exercise #1") });
    expect(damage((f) => { f.data.activeSession.exercises[0].sets[0].done = "yes"; })).toMatchObject({ ok: false, error: expect.stringContaining("in progress") });
    expect(damage((f) => { f.data.sessions = [null]; })).toMatchObject({ ok: false });
    expect(damage((f) => { f.data.templates = [5]; })).toMatchObject({ ok: false });
  });

  it("every rejection says nothing was changed or why", () => {
    const f = good(); f.data.sessions[0].id = "";
    const r = reject(f);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Nothing was changed");
  });

  it("accepts an older-style backup missing the newer fields (profile, lastBackupAt)", () => {
    const f = good(); delete f.data.profile; delete f.data.lastBackupAt;
    const r = reject(f);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.profile).toEqual({ name: "", goal: "muscle", sessionsPerWeek: 3 });
  });
});

describe("helpers", () => {
  it("describes the contents", () => {
    expect(describeData(sample())).toBe("3 logged workouts, 2 saved workouts, 1 custom exercise");
    expect(describeData({ ...freshData(), templates: [] })).toBe("0 logged workouts, 0 saved workouts, 0 custom exercises");
  });
  it("counts days since the last backup", () => {
    expect(daysSinceBackup(freshData(), NOW)).toBeNull();
    expect(daysSinceBackup({ ...freshData(), lastBackupAt: new Date(2026, 9, 4, 12).toISOString() }, NOW)).toBe(3);
  });
  it("nudges only when there is something to protect and no recent backup", () => {
    const d = sample();
    expect(backupIsDue(d, NOW)).toBe(true); // never backed up, 3 workouts
    expect(backupIsDue({ ...d, sessions: d.sessions.slice(0, 2) }, NOW)).toBe(false); // too little data
    expect(backupIsDue({ ...d, lastBackupAt: new Date(2026, 9, 1, 12).toISOString() }, NOW)).toBe(false); // 6 days ago
    expect(backupIsDue({ ...d, lastBackupAt: new Date(2026, 8, 20, 12).toISOString() }, NOW)).toBe(true); // 17 days ago
  });
  it("clearing history keeps workouts, exercises and profile", () => {
    const cleared = clearHistory(sample());
    expect(cleared.sessions).toEqual([]);
    expect(cleared.activeSession).toBeNull();
    expect(cleared.templates).toHaveLength(2);
    expect(cleared.customExercises).toHaveLength(1);
    expect(cleared.profile.name).toBe("Sam");
  });
});
