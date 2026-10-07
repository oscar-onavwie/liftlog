import { useState } from "react";
import { ExercisesScreen } from "./screens/ExercisesScreen";
import { WorkoutsScreen } from "./screens/WorkoutsScreen";
import { useAppData } from "./useAppData";

type Tab = "workouts" | "exercises";

export function App() {
  const { data, update, exercises } = useAppData();
  const [tab, setTab] = useState<Tab>("workouts");

  return (
    <>
      <main className="screen">
        {tab === "workouts" && <WorkoutsScreen data={data} exercises={exercises} update={update} />}
        {tab === "exercises" && <ExercisesScreen data={data} exercises={exercises} update={update} />}
      </main>
      <nav className="tabbar">
        <button className={tab === "workouts" ? "active" : ""} onClick={() => setTab("workouts")}>Workouts</button>
        <button className={tab === "exercises" ? "active" : ""} onClick={() => setTab("exercises")}>Exercises</button>
      </nav>
    </>
  );
}
