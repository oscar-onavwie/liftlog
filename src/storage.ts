import { STARTER_TEMPLATES } from "./data/starterTemplates";
import type { AppData, Goal, Profile } from "./types";

const KEY = "liftlog:data";

export function freshData(): AppData {
  return {
    version: 1,
    customExercises: [],
    templates: structuredClone(STARTER_TEMPLATES),
    sessions: [],
    activeSession: null,
    profile: { ...DEFAULT_PROFILE },
  };
}

export const DEFAULT_PROFILE: Profile = { name: "", goal: "muscle", sessionsPerWeek: 3 };
const GOALS: Goal[] = ["muscle", "strength", "consistency"];

/** Accept whatever profile was saved, falling back to sensible values for anything missing or odd. */
export function normalizeProfile(value: unknown): Profile {
  const p = (value ?? {}) as Partial<Profile>;
  const perWeek = Number(p.sessionsPerWeek);
  return {
    name: typeof p.name === "string" ? p.name.slice(0, 40) : DEFAULT_PROFILE.name,
    goal: GOALS.includes(p.goal as Goal) ? (p.goal as Goal) : DEFAULT_PROFILE.goal,
    sessionsPerWeek: Number.isInteger(perWeek) && perWeek >= 1 && perWeek <= 7 ? perWeek : DEFAULT_PROFILE.sessionsPerWeek,
  };
}

/**
 * Turn whatever was saved into valid app data. Data saved by older versions of the app
 * (which lack newer fields) is upgraded by filling in the missing pieces. Returns null if unusable.
 */
export function normalizeData(value: unknown): AppData | null {
  const d = value as Partial<AppData> | null;
  if (!d || typeof d !== "object" || d.version !== 1) return null;
  if (!Array.isArray(d.customExercises) || !Array.isArray(d.templates)) return null;
  return {
    version: 1,
    customExercises: d.customExercises,
    templates: d.templates,
    sessions: Array.isArray(d.sessions) ? d.sessions : [],
    activeSession: d.activeSession ?? null,
    profile: normalizeProfile(d.profile),
    ...(typeof d.lastBackupAt === "string" && !Number.isNaN(Date.parse(d.lastBackupAt)) ? { lastBackupAt: d.lastBackupAt } : {}),
  };
}

/** Read saved data from the phone. If nothing (or something broken) is there, start fresh. */
export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = normalizeData(JSON.parse(raw));
      if (data) return data;
    }
  } catch {
    // Storage blocked or data unreadable: fall through to fresh data.
  }
  return freshData();
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked (e.g. private browsing). The app keeps working, it just can't remember.
  }
}
