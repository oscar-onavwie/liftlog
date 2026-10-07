import type { LoggedSet, Recommendation, Session } from "./types";

// The "brain": decides what weight and reps to aim for next time.
// Plain function, no screens, no saving — so it can be tested thoroughly.
// The rules are written out in docs/PLAN.md ("Progression rules v1").

export const GAP_DAYS_SMALL = 14; // longer than this away → ease back in by 5%
export const GAP_DAYS_LARGE = 28; // longer than this away → ease back in by 10%
export const REDUCE_FRACTION = 0.05; // drop after two tough sessions in a row

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RecommendInput {
  exerciseId: string;
  /** Smallest weight jump, e.g. 2.5 */
  stepKg: number;
  /** The template's plan for this exercise */
  sets: number;
  repMin: number;
  repMax: number;
  /** All finished workouts, oldest first */
  sessions: Session[];
  now: Date;
}

interface Performance {
  finishedAt: string;
  sets: LoggedSet[];
  reduced: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const roundToStep = (kg: number, step: number) => round2(Math.round(kg / step) * step);

function performances(sessions: Session[], exerciseId: string): Performance[] {
  const found: Performance[] = [];
  for (const s of sessions) {
    const e = s.exercises.find((x) => x.exerciseId === exerciseId && x.sets.length > 0);
    if (e) found.push({ finishedAt: s.finishedAt, sets: e.sets, reduced: s.reduced === true });
  }
  return found;
}

/** The sets that count: those at the heaviest weight used (lighter sets are warm-ups or drop sets). */
function workingSets(sets: LoggedSet[]): { weight: number; reps: number[] } {
  const weight = Math.max(...sets.map((s) => s.weightKg));
  return { weight, reps: sets.filter((s) => s.weightKg === weight).map((s) => s.reps) };
}

/** A lower weight than `weight`: about `fraction` lighter, but always at least one step lighter. */
function lighter(weight: number, fraction: number, step: number): number {
  const target = roundToStep(weight * (1 - fraction), step);
  return Math.max(0, target < weight ? target : round2(weight - step));
}

export function recommend(input: RecommendInput): Recommendation {
  const { stepKg, sets, repMin, repMax, now } = input;
  const all = performances(input.sessions, input.exerciseId);
  const judged = all.filter((p) => !p.reduced); // low-energy sessions are never used to judge you

  if (judged.length === 0) {
    return {
      kind: "first-time",
      weightKg: null,
      targetReps: repMin,
      message: `First time: pick a weight you can lift ${repMin}–${repMax} times with a couple of reps to spare.`,
    };
  }

  const last = judged[judged.length - 1]!;
  const { weight, reps } = workingSets(last.sets);
  const repsText = reps.join(", ");
  const best = Math.max(...reps);
  const fullSets = reps.length >= sets;
  const hitTop = fullSets && reps.every((r) => r >= repMax);
  const struggled = (r: number[]) => r.some((x) => x < repMin);

  // 1. Away for a while: ease back in, no increase.
  const lastAny = all[all.length - 1]!;
  const daysAway = (now.getTime() - new Date(lastAny.finishedAt).getTime()) / DAY_MS;
  if (daysAway > GAP_DAYS_SMALL) {
    const fraction = daysAway > GAP_DAYS_LARGE ? 0.1 : 0.05;
    const eased = lighter(weight, fraction, stepKg);
    return {
      kind: "return",
      weightKg: eased,
      targetReps: clamp(best, repMin, repMax),
      message: `It's been ${Math.floor(daysAway)} days since you last did this. Ease back in at ${eased} kg (${Math.round(fraction * 100)}% lighter than ${weight} kg) — you'll build back quickly.`,
    };
  }

  // 2. Hit the top of the range on every set: add weight.
  if (hitTop) {
    const up = round2(weight + stepKg);
    return {
      kind: "increase",
      weightKg: up,
      targetReps: repMin,
      message: `You hit ${repsText} at ${weight} kg. Go up to ${up} kg and aim for ${repMin} reps on every set.`,
    };
  }

  if (struggled(reps)) {
    // 3. Two tough sessions in a row at the same weight: step back.
    const previous = judged[judged.length - 2];
    if (previous) {
      const before = workingSets(previous.sets);
      if (before.weight === weight && struggled(before.reps)) {
        const down = lighter(weight, REDUCE_FRACTION, stepKg);
        return {
          kind: "reduce",
          weightKg: down,
          targetReps: Math.ceil((repMin + repMax) / 2),
          message: `Two tough sessions in a row at ${weight} kg. Drop to ${down} kg, get some quality reps, and build back up.`,
        };
      }
    }
    // 4. First tough session: stay put.
    return {
      kind: "hold",
      weightKg: weight,
      targetReps: repMin,
      message: `Some sets were under ${repMin} reps at ${weight} kg (${repsText}). Stay at ${weight} kg and aim for ${repMin} on every set.`,
    };
  }

  // 5. Somewhere in the range: same weight, bring every set up to your best set (or one more if all were equal).
  const allEqual = reps.every((r) => r === best);
  const target = Math.min(repMax, allEqual ? best + 1 : best);
  const finishNote = fullSets ? "" : ` Do all ${sets} sets this time.`;
  return {
    kind: "build",
    weightKg: weight,
    targetReps: target,
    message: `Last time: ${repsText} at ${weight} kg. Stay at ${weight} kg and aim for ${target} reps on every set.${finishNote}`,
  };
}
