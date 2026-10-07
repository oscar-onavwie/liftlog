import type { Session } from "./types";

/** Newest first, for showing in a list. */
export function newestFirst(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/** How long the workout took, in whole minutes (at least 1). */
export function durationMinutes(session: Session): number {
  const ms = new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime();
  return Math.max(1, Math.round(ms / 60000));
}

export function countSets(session: Session): number {
  return session.exercises.reduce((n, e) => n + e.sets.length, 0);
}

/** e.g. "Tue 6 Oct" — uses the phone's own language and date style. */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function removeSession(sessions: Session[], id: string): Session[] {
  return sessions.filter((s) => s.id !== id);
}
