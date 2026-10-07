import { useCallback, useEffect, useMemo, useState } from "react";
import { BUILT_IN_EXERCISES } from "./data/exercises";
import { loadData, saveData } from "./storage";
import type { AppData, Exercise } from "./types";

/** Holds all saved data in memory and writes it to the phone whenever it changes. */
export function useAppData() {
  const [data, setData] = useState<AppData>(loadData);

  useEffect(() => saveData(data), [data]);

  const update = useCallback((change: (old: AppData) => AppData) => setData(change), []);

  const exercises: Exercise[] = useMemo(
    () => [...BUILT_IN_EXERCISES, ...data.customExercises],
    [data.customExercises]
  );

  /** Swap in a whole new set of data (used when restoring a backup). */
  const replaceAll = useCallback((next: AppData) => setData(next), []);

  return { data, update, exercises, replaceAll };
}
