import type { LoggedSet, Session } from "./types";

// Numbers for the Progress tab. Plain functions, no screens.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight at the start of the Monday of the week containing `date` (phone's local time). */
export function startOfWeek(date: Date): Date {
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday);
}

export interface WeekBucket {
  start: Date;
  /** Workouts on normal days */
  normal: number;
  /** Workouts on low-energy (Tired/Exhausted) days */
  lowEnergy: number;
}

/** Workouts per week for the last `weeks` weeks, oldest first. The last bucket is the current week. */
export function weeklyCounts(sessions: Session[], now: Date, weeks: number): WeekBucket[] {
  const thisWeek = startOfWeek(now);
  const buckets: WeekBucket[] = Array.from({ length: weeks }, (_, i) => ({
    start: new Date(thisWeek.getFullYear(), thisWeek.getMonth(), thisWeek.getDate() - 7 * (weeks - 1 - i)),
    normal: 0,
    lowEnergy: 0,
  }));
  for (const s of sessions) {
    const when = startOfWeek(new Date(s.startedAt)).getTime();
    const bucket = buckets.find((b) => b.start.getTime() === when);
    if (!bucket) continue;
    if (s.reduced) bucket.lowEnergy++;
    else bucket.normal++;
  }
  return buckets;
}

/** How many workouts were done on low-energy days, in the last `days` days (or ever, if days is omitted). */
export function lowEnergyCount(sessions: Session[], now: Date, days?: number): number {
  return sessions.filter(
    (s) => s.reduced && (days === undefined || now.getTime() - new Date(s.startedAt).getTime() <= days * DAY_MS)
  ).length;
}

/**
 * Estimated best single lift from a set of several reps (the standard "Epley" formula):
 * weight × (1 + reps ÷ 30). One rep is just the weight. Rounded to 0.1 kg.
 */
export function estimatedMax(weightKg: number, reps: number): number {
  const value = reps <= 1 ? weightKg : weightKg * (1 + reps / 30);
  return Math.round(value * 10) / 10;
}

export interface StrengthPoint {
  sessionId: string;
  at: string; // ISO date-time
  estimatedMaxKg: number;
  topSet: LoggedSet; // the set that gave the highest estimate
  lowEnergy: boolean;
}

/** One point per workout that included this exercise, oldest first. */
export function strengthSeries(sessions: Session[], exerciseId: string): StrengthPoint[] {
  const points: StrengthPoint[] = [];
  for (const s of sessions) {
    const e = s.exercises.find((x) => x.exerciseId === exerciseId && x.sets.length > 0);
    if (!e) continue;
    let top = e.sets[0]!;
    for (const set of e.sets) {
      if (estimatedMax(set.weightKg, set.reps) > estimatedMax(top.weightKg, top.reps)) top = set;
    }
    points.push({
      sessionId: s.id,
      at: s.startedAt,
      estimatedMaxKg: estimatedMax(top.weightKg, top.reps),
      topSet: top,
      lowEnergy: s.reduced === true,
    });
  }
  return points.sort((a, b) => a.at.localeCompare(b.at));
}

/** Exercise ids that have been logged at least once, most recently done first. */
export function exercisesWithHistory(sessions: Session[]): string[] {
  const lastSeen = new Map<string, string>();
  for (const s of sessions)
    for (const e of s.exercises)
      if (e.sets.length > 0 && (lastSeen.get(e.exerciseId) ?? "") < s.startedAt) lastSeen.set(e.exerciseId, s.startedAt);
  return [...lastSeen.entries()].sort((a, b) => b[1].localeCompare(a[1])).map(([id]) => id);
}

/** Round, tidy axis tick values covering min..max (e.g. 60, 70, 80, 90). */
export function niceTicks(min: number, max: number, target = 4): number[] {
  if (!(max > min)) return [Math.floor(min), Math.floor(min) + 1];
  const rough = (max - min) / target;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude;
  const ticks: number[] = [];
  const first = Math.floor(min / step);
  const last = Math.ceil(max / step);
  for (let i = first; i <= last; i++) ticks.push(Math.round(i * step * 1000) / 1000);
  return ticks;
}
