import { useState } from "react";
import { BackupCard } from "../components/BackupCard";
import { StrengthChart } from "../components/StrengthChart";
import { WeeklyChart } from "../components/WeeklyChart";
import { exercisesWithHistory, lowEnergyCount, strengthSeries, weeklyCounts } from "../stats";
import type { AppData, Exercise, Goal, Profile } from "../types";

interface Props {
  data: AppData;
  exercises: Exercise[];
  update: (change: (old: AppData) => AppData) => void;
  replaceAll: (data: AppData) => void;
}

export const GOAL_LABELS: Record<Goal, string> = {
  muscle: "Build muscle",
  strength: "Get stronger",
  consistency: "Train consistently",
};

export function ProgressScreen({ data, exercises, update, replaceAll }: Props) {
  const now = new Date();
  const { profile, sessions } = data;
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const weeks = weeklyCounts(sessions, now, 8);
  const thisWeek = weeks[weeks.length - 1]!;
  const doneThisWeek = thisWeek.normal + thisWeek.lowEnergy;
  const target = profile.sessionsPerWeek;
  const lowAll = lowEnergyCount(sessions, now);
  const low30 = lowEnergyCount(sessions, now, 30);

  const trained = exercisesWithHistory(sessions);
  const [chosen, setChosen] = useState<string | null>(null);
  const exerciseId = chosen && trained.includes(chosen) ? chosen : trained[0];
  const points = exerciseId ? strengthSeries(sessions, exerciseId) : [];

  const setProfile = (change: Partial<Profile>) => update((d) => ({ ...d, profile: { ...d.profile, ...change } }));

  const weekNote =
    doneThisWeek >= target
      ? "Weekly target reached. Nice work."
      : `${target - doneThisWeek} more ${target - doneThisWeek === 1 ? "workout" : "workouts"} to hit your target. A short low-energy session counts too.`;

  return (
    <section>
      <h1>Progress</h1>
      <p className="muted">{profile.name ? `${profile.name} · ` : ""}Goal: {GOAL_LABELS[profile.goal]}</p>

      <div className="card hero">
        <div className="hero-number">
          {doneThisWeek}
          <span className="hero-of"> of {target}</span>
        </div>
        <div className="muted">workouts this week</div>
        <div className="meter" role="progressbar" aria-valuenow={Math.min(doneThisWeek, target)} aria-valuemin={0} aria-valuemax={target}>
          <div style={{ width: `${Math.min(100, (doneThisWeek / target) * 100)}%` }} />
        </div>
        <p className="muted">{weekNote}</p>
      </div>

      <div className="tiles">
        <div className="card tile">
          <div className="tile-value">{sessions.length}</div>
          <div className="muted">workouts logged</div>
        </div>
        <div className="card tile">
          <div className="tile-value">{lowAll}</div>
          <div className="muted">
            low-energy days trained{lowAll > 0 ? ` (${low30} in the last 30 days)` : ""}
          </div>
        </div>
      </div>
      {sessions.length > 0 && lowAll === 0 && (
        <p className="muted">When you pick Tired or Exhausted and still train, it shows up here. Those are the days other apps lose you.</p>
      )}

      <h2>Workouts per week</h2>
      <div className="card">
        {sessions.length === 0 ? <p className="muted">Your weekly chart appears after your first workout.</p> : <WeeklyChart weeks={weeks} target={target} />}
      </div>

      <h2>Strength</h2>
      <div className="card">
        {points.length === 0 ? (
          <p className="muted">Finish a workout and your strength chart appears here.</p>
        ) : (
          <>
            <label className="field">
              Exercise
              <select value={exerciseId} onChange={(e) => setChosen(e.target.value)}>
                {trained.map((id) => (
                  <option key={id} value={id}>{byId.get(id)?.name ?? "(exercise no longer exists)"}</option>
                ))}
              </select>
            </label>
            <p className="muted small-print">
              “Estimated best” is the heaviest single lift your set suggests (weight × reps, standard formula). It rises when you add reps, not just weight.
            </p>
            <StrengthChart points={points} resetKey={exerciseId!} />
          </>
        )}
      </div>

      <h2>Profile &amp; goals</h2>
      <div className="card form">
        <label>
          Name
          <input value={profile.name} maxLength={40} onChange={(e) => setProfile({ name: e.target.value })} placeholder="Optional" />
        </label>
        <label>
          Goal
          <select value={profile.goal} onChange={(e) => setProfile({ goal: e.target.value as Goal })}>
            {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
              <option key={g} value={g}>{GOAL_LABELS[g]}</option>
            ))}
          </select>
        </label>
        <div className="stepper" aria-label="Workouts per week">
          <span>Workouts per week</span>
          <button className="small" onClick={() => setProfile({ sessionsPerWeek: target - 1 })} disabled={target <= 1} aria-label="fewer workouts per week">−</button>
          <strong>{target}</strong>
          <button className="small" onClick={() => setProfile({ sessionsPerWeek: target + 1 })} disabled={target >= 7} aria-label="more workouts per week">+</button>
        </div>
        <p className="muted small-print">
          Your weekly target drives the dashboard. Your goal is a reminder for now. Weights are shown in kg.
        </p>
      </div>

      <h2 id="backup">Backup &amp; data</h2>
      <BackupCard data={data} replaceAll={replaceAll} />
    </section>
  );
}
