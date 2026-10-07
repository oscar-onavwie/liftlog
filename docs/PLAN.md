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

## Working agreements with the owner
- Beginner, works from a phone. Explain before changing. One small change at a time. Give exact test steps.
- Avoid jargon; define any term the first time it is used.
- If something breaks, diagnose and fix it; never ask the owner to write code.
- Working product beats extra features.
