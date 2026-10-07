# LiftLog — Product & Build Plan

This file is the project's memory. Read it at the start of every session.

## One-line concept
A lifting app for people with unpredictable energy and schedules (starting with shift workers).
It tells you exactly what to lift today, adjusts to how you feel, and never makes a bad day cost you progress.

## What we are really testing
Not "can we build an app" but: **do people with irregular lives stick with training longer when the app
adapts to them instead of scolding them?** Everything in the MVP serves that question.

## Target user (v1)
Adults who lift 2–4x/week, work long or physical/irregular shifts (nurses, warehouse, trades, hospitality,
emergency services), are past the "total beginner" stage, and are tired of guessing weights.
The first user is the owner of this repo, which is a feature, not a bug: instant feedback.

## Strongest pain point
Not "I can't log workouts" (solved). It is two things:
1. **Decision friction:** "What weight and reps do I do today?" at the start of every exercise.
2. **Bad-day guilt:** wrecked after a shift, the user either skips entirely or does a full session badly,
   and most apps either ignore it or make them feel they failed.

## Differentiation (be honest)
Adaptive progressive overload alone is NOT new (Alpha Progression, Fitbod, Juggernaut AI, RP Hypertrophy do it).
Where we can genuinely differ:
- **Minimum effective workout** for bad days (a real, short, useful session — not "rest day").
- **A low-energy session never hurts the progression history.** Reduced-on-purpose sessions are tagged and
  are not treated as "performance dropped".
- **Gap-aware:** missed a week or three? The app eases you back in instead of pretending nothing happened.
- Built for shift patterns, not a fixed Mon/Wed/Fri calendar.

## Technology (simple version)
- **Web app that installs on a phone's home screen (a "PWA")**, built with React + TypeScript + Vite.
  Why: you can test it on your phone through a link; no app stores, no accounts, free to host.
- **Data is stored on the phone itself** (browser storage). No server, no login, nothing to hack, nothing to pay for.
  Trade-off: data lives on one device, so we add Export/Import backup early.
- **Hosting:** GitHub Pages (free), deployed automatically on every push to the main branch.
- **The "brain" (progression rules) is plain, separate, unit-tested code** so we can trust it and change it safely.
- No UI framework, no state library, no backend. Add only when a real problem demands it.

## Progression rules v1 (double progression)
Each exercise in a template has a rep range (e.g. 6–8) and a number of sets.
- Hit the top of the range on every set → **add weight** (per-exercise step, e.g. 2.5 kg), target back to range bottom+.
- Otherwise → **same weight**, target = best set from last time on every set (8,7,6 → 8,8,8).
- Missed the bottom of the range on a set, or total reps clearly down → **hold weight**; two such sessions in a row → **reduce ~5–10%**.
- Gap since last time: >14 days → −5%, >28 days → −10%.
- Sessions done on Tired/Exhausted days are tagged "reduced" and are **ignored** when judging performance drops and
  never trigger an increase.

## Readiness rules v1
| Check-in | Today's workout |
|---|---|
| Strong | As planned |
| Good | As planned |
| Average | As planned |
| Tired | One fewer set per exercise, same weight, no weight increases |
| Exhausted | "Minimum effective workout": top 2–3 compound lifts only, 2 sets each, ~90% weight, ~20 min |

## MVP scope (build order)
| # | Milestone | Done when |
|---|---|---|
| 0 | Project set-up + live link on phone | A "hello" page opens from a link and installs to the home screen |
| 1 | Exercises + workout templates | Built-in exercise list; one starter template; can edit it |
| 2 | Today's workout + set logging | Can start a workout and record weight/reps per set (no advice yet) |
| 3 | Workout history | Past sessions listed and viewable |
| 4 | Progressive overload engine | Today's workout pre-fills the recommended weight/reps; rules are unit-tested |
| 5 | Readiness check-in | The five-option check-in changes the workout per the table above |
| 6 | Profile, goals, basic dashboard | Name/units/goal; per-exercise progress chart; sessions per week |
| 7 | Backup + real use | Export/Import data; owner uses it for 4 weeks |

Explicitly NOT in MVP: social, payments, messaging, nutrition, wearables, AI chat, accounts, cloud sync.

## Success signals (after ~4 weeks of own use, then 3–5 shift-working friends)
- Did I open it before every session? Did I ever *not* wonder what weight to use?
- On Tired/Exhausted days, did I do the short session instead of skipping?
- Would a friend still be using it in week 3 without me nagging them?
- Which single feature did they actually touch?

## Status
- M0 done (live on GitHub Pages: https://oscar-onavwie.github.io/liftlog/).
- M1 built: exercise library, starter templates (Full Body A/B), template editor, custom exercises. Data is saved in the phone's localStorage under `liftlog:data`.
- M2 built: Today tab (start a workout, log weight/reps per set, finish/cancel). A workout in progress is saved (`activeSession`) so closing the app loses nothing; finished workouts go to `sessions`. Weight/reps are kept as text while typing and converted on finish.
- M3 built: History tab (newest first, tap for set-by-set detail, delete with confirmation).
- M4 built: progression engine (`src/progression.ts`, tested) wired into Today: each exercise gets a "Today's goal" (weight, reps, one-sentence reason), weight pre-filled, reps never pre-filled.
  Implementation details of the rules: judged on the most recent non-"reduced" session; the "working weight" is the heaviest weight used (lighter sets = warm-ups/drop sets, ignored);
  an increase needs all planned sets at the top of the range; doing fewer sets than planned blocks an increase; after an increase the target is the bottom of the range;
  "all sets equal" → target +1 rep; two tough sessions in a row at the same weight → -5% (rounded to the exercise's step, always at least one step); after a drop, target is the middle of the range;
  gap is measured from the last session of that exercise (reduced or not). `Session.reduced` exists and is ignored by the engine; Milestone 5 will set it.
  Known simplification: "total reps clearly down" is not a separate rule; only a set under the bottom of the range counts as a tough session.
- M5 built: readiness check-in on Today (required before starting). `src/readiness.ts` shapes the workout: Tired = one fewer set each (never below 2, never above planned), same weight, no increase, match last time;
  Exhausted = first 2-3 big lifts in template order (tops up from the first exercises if <2 big lifts), max 2 sets each, ~10% lighter than the normal recommendation (rounded to the exercise's step), message says to leave 2+ reps in the tank.
  Tired/Exhausted sessions are saved with `readiness` and `reduced: true`; the engine ignores reduced sessions, so a low-energy day never changes later targets. History shows the emoji and an explanation.
  Open question for real use: Tired days at full weight don't count towards progression either (by design); revisit if it feels like lost progress.
- M6 built: Progress tab (`src/screens/ProgressScreen.tsx`, `src/stats.ts`, `src/components/{WeeklyChart,StrengthChart}.tsx`) and `AppData.profile` (name, goal, sessionsPerWeek 1-7; defaults filled in for older saved data).
  Hero = workouts this week vs target; tiles = workouts logged and low-energy days trained (the key metric for the hypothesis); weekly stacked bars (normal vs low-energy) with a target line; per-exercise strength chart.
  Strength chart plots an *estimated best single lift* (Epley: weight x (1 + reps/30)) because double progression keeps weight flat while reps rise. The line joins normal days only; low-energy days are separate indigo dots so they never look like regressions.
  Chart colours (normal #12a874, low-energy #7480f2) passed the dataviz palette validator on the dark card surface; every chart has a "View as table". Weeks start on Monday.
  Simplifications: weights are kg only (no lb setting yet); `goal` is stored and shown but does not change recommendations yet.
- M7 built: Backup & data card at the bottom of the Progress tab (`src/backup.ts`, `src/components/BackupCard.tsx`). Save backup file (dated .json download, plus a Share button where the phone supports sharing files),
  Restore from file (strict validation, preview + confirmation, replaces everything, never throws; bad files are refused with a reason), Clear workout history (keeps templates, custom exercises, profile).
  `AppData.lastBackupAt` drives a nudge on Today (3+ workouts and no backup in 14 days). Backup file = `{app:"liftlog", formatVersion:1, exportedAt, data}`.
  **The MVP is feature-complete.** Next: the 4-week test in `docs/FOUR_WEEK_TEST.md` (no new features during the test; wishlist only).
- Owner has authorised merging each milestone's PR to main without asking again (tell them what went live).

## Working agreements with the owner
- Beginner, works from a phone. Explain before changing. One small change at a time. Give exact test steps.
- Avoid jargon; define any term the first time it is used.
- If something breaks, diagnose and fix it; never ask the owner to write code.
- Working product beats extra features.
