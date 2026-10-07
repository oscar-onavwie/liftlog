import { normalizeData } from "./storage";
import type { AppData } from "./types";

// Saving all app data to a file and restoring it. The file is plain JSON:
//   { "app": "liftlog", "formatVersion": 1, "exportedAt": "...", "data": { ...everything... } }

const MAX_BYTES = 5 * 1024 * 1024;
const MUSCLES = ["chest", "back", "shoulders", "legs", "arms", "core"];
const EQUIPMENT = ["barbell", "dumbbell", "machine", "cable", "bodyweight"];

export interface BackupFile {
  app: "liftlog";
  formatVersion: 1;
  exportedAt: string;
  data: AppData;
}

export type ParseResult = { ok: true; data: AppData; exportedAt: string } | { ok: false; error: string };

/** The text to write into the backup file. Marks the data as backed up now. */
export function buildBackup(data: AppData, now: Date): { text: string; stamped: AppData } {
  const stamped: AppData = { ...data, lastBackupAt: now.toISOString() };
  const file: BackupFile = { app: "liftlog", formatVersion: 1, exportedAt: now.toISOString(), data: stamped };
  return { text: JSON.stringify(file, null, 2), stamped };
}

export function backupFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `liftlog-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isNum = (v: unknown, min = -Infinity): v is number => typeof v === "number" && Number.isFinite(v) && v >= min;
const isInt = (v: unknown, min: number): v is number => isNum(v, min) && Number.isInteger(v);
const isDate = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(Date.parse(v));

/** Returns a plain-English description of the first problem found, or null if everything looks fine. */
function findProblem(d: AppData): string | null {
  for (const [i, e] of d.customExercises.entries()) {
    if (!isObj(e) || !isStr(e.id) || !isStr(e.name) || !MUSCLES.includes(e.muscle as string) ||
        !EQUIPMENT.includes(e.equipment as string) || typeof e.compound !== "boolean" || !isNum(e.stepKg, 0.01))
      return `Custom exercise #${i + 1} looks damaged.`;
  }
  for (const [i, t] of d.templates.entries()) {
    if (!isObj(t) || !isStr(t.id) || typeof t.name !== "string" || !Array.isArray(t.exercises))
      return `Saved workout #${i + 1} looks damaged.`;
    for (const e of t.exercises as unknown[]) {
      if (!isObj(e) || !isStr(e.exerciseId) || !isInt(e.sets, 1) || !isInt(e.repMin, 1) || !isInt(e.repMax, 1))
        return `Saved workout "${String(t.name)}" has a damaged exercise.`;
    }
  }
  for (const [i, s] of d.sessions.entries()) {
    if (!isObj(s) || !isStr(s.id) || !isStr(s.templateId) || typeof s.templateName !== "string" ||
        !isDate(s.startedAt) || !isDate(s.finishedAt) || !Array.isArray(s.exercises))
      return `Logged workout #${i + 1} looks damaged.`;
    for (const e of s.exercises as unknown[]) {
      if (!isObj(e) || !isStr(e.exerciseId) || !isNum(e.repMin, 0) || !isNum(e.repMax, 0) || !isNum(e.targetSets, 0) || !Array.isArray(e.sets))
        return `Logged workout #${i + 1} has a damaged exercise.`;
      for (const set of e.sets as unknown[]) {
        if (!isObj(set) || !isNum(set.weightKg, 0) || !isInt(set.reps, 1)) return `Logged workout #${i + 1} has a damaged set.`;
      }
    }
  }
  const a = d.activeSession;
  if (a !== null) {
    if (!isObj(a) || !isStr(a.id) || !isStr(a.templateId) || !isDate(a.startedAt) || !Array.isArray(a.exercises))
      return "The workout that was in progress looks damaged.";
    for (const e of a.exercises as unknown[]) {
      if (!isObj(e) || !isStr(e.exerciseId) || !Array.isArray(e.sets)) return "The workout that was in progress looks damaged.";
      for (const set of e.sets as unknown[]) {
        if (!isObj(set) || typeof set.weight !== "string" || typeof set.reps !== "string" || typeof set.done !== "boolean")
          return "The workout that was in progress looks damaged.";
      }
    }
  }
  return null;
}

/** Read and check the text of a backup file. Never throws; says what is wrong in plain words. */
export function parseBackup(text: string): ParseResult {
  if (text.length > MAX_BYTES) return { ok: false, error: "That file is far too big to be a LiftLog backup." };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't a LiftLog backup (it couldn't be read)." };
  }
  if (!isObj(raw) || raw.app !== "liftlog") return { ok: false, error: "That file isn't a LiftLog backup." };
  if (raw.formatVersion !== 1)
    return { ok: false, error: "That backup was made by a newer version of LiftLog. Reload the app and try again." };
  const data = normalizeData(raw.data);
  if (!data) return { ok: false, error: "The backup is missing its data." };
  const problem = findProblem(data);
  if (problem) return { ok: false, error: `${problem} Nothing was changed.` };
  return { ok: true, data, exportedAt: isDate(raw.exportedAt) ? raw.exportedAt : new Date(0).toISOString() };
}

/** "12 workouts, 2 saved workouts, 1 custom exercise" */
export function describeData(d: AppData): string {
  const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  return [
    n(d.sessions.length, "logged workout", "logged workouts"),
    n(d.templates.length, "saved workout", "saved workouts"),
    n(d.customExercises.length, "custom exercise", "custom exercises"),
  ].join(", ");
}

/** Whole days since the last backup, or null if there has never been one. */
export function daysSinceBackup(data: AppData, now: Date): number | null {
  if (!data.lastBackupAt) return null;
  return Math.max(0, Math.floor((now.getTime() - new Date(data.lastBackupAt).getTime()) / 86400000));
}

/** Time to nudge? Only once there's something worth protecting: 3+ workouts and no backup in 14 days. */
export function backupIsDue(data: AppData, now: Date): boolean {
  if (data.sessions.length < 3) return false;
  const days = daysSinceBackup(data, now);
  return days === null || days >= 14;
}

/** Keep the user's saved workouts and profile but erase logged workouts and any workout in progress. */
export function clearHistory(data: AppData): AppData {
  return { ...data, sessions: [], activeSession: null };
}
