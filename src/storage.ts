import { STARTER_TEMPLATES } from "./data/starterTemplates";
import type { AppData } from "./types";

const KEY = "liftlog:data";

export function freshData(): AppData {
  return { version: 1, customExercises: [], templates: structuredClone(STARTER_TEMPLATES) };
}

function isValid(value: unknown): value is AppData {
  const d = value as AppData;
  return (
    !!d &&
    d.version === 1 &&
    Array.isArray(d.customExercises) &&
    Array.isArray(d.templates)
  );
}

/** Read saved data from the phone. If nothing (or something broken) is there, start fresh. */
export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValid(parsed)) return parsed;
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
