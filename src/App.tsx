import { useState } from "react";
import { TodayScreen } from "./screens/TodayScreen";
import { ProgressScreen } from "./screens/ProgressScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { ExercisesScreen } from "./screens/ExercisesScreen";
import { WorkoutsScreen } from "./screens/WorkoutsScreen";
import { useAppData } from "./useAppData";

type Tab = "today" | "history" | "progress" | "workouts" | "exercises";

export function App() {
  const { data, update, exercises, replaceAll } = useAppData();
  const [tab, setTab] = useState<Tab>("today");

  return (
    <>
      <main className="screen">
        {tab === "today" && <TodayScreen data={data} exercises={exercises} update={update} onBackup={() => { setTab("progress"); setTimeout(() => document.getElementById("backup")?.scrollIntoView(), 50); }} />}
        {tab === "history" && <HistoryScreen data={data} exercises={exercises} update={update} />}
        {tab === "progress" && <ProgressScreen data={data} exercises={exercises} update={update} replaceAll={replaceAll} />}
        {tab === "workouts" && <WorkoutsScreen data={data} exercises={exercises} update={update} />}
        {tab === "exercises" && <ExercisesScreen data={data} exercises={exercises} update={update} />}
      </main>
      <nav className="tabbar">
        <button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}>Today</button>
        <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>History</button>
        <button className={tab === "progress" ? "active" : ""} onClick={() => setTab("progress")}>Progress</button>
        <button className={tab === "workouts" ? "active" : ""} onClick={() => setTab("workouts")}>Workouts</button>
        <button className={tab === "exercises" ? "active" : ""} onClick={() => setTab("exercises")}>Exercises</button>
      </nav>
    </>
  );
}
