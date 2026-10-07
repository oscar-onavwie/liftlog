import { useRef, useState } from "react";
import { backupFileName, buildBackup, clearHistory, daysSinceBackup, describeData, parseBackup } from "../backup";
import type { AppData } from "../types";

interface Props {
  data: AppData;
  /** Replace everything the app has saved. */
  replaceAll: (data: AppData) => void;
}

type Pending = { data: AppData; exportedAt: string; fileName: string };

function lastBackupText(data: AppData): string {
  const days = daysSinceBackup(data, new Date());
  if (days === null) return "You haven't saved a backup yet.";
  if (days === 0) return "Last backup: today.";
  return `Last backup: ${days} ${days === 1 ? "day" : "days"} ago.`;
}

export function BackupCard({ data, replaceAll }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const now = () => new Date();

  function makeFile() {
    const when = now();
    const { text, stamped } = buildBackup(data, when);
    return { file: new File([text], backupFileName(when), { type: "application/json" }), stamped };
  }

  function save() {
    const { file, stamped } = makeFile();
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    replaceAll(stamped);
    setMessage({ kind: "ok", text: `Saved ${file.name}. Check your Downloads folder, and keep a copy somewhere safe (Drive, email to yourself).` });
  }

  const canShare = typeof navigator !== "undefined" && typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [new File(["{}"], "x.json", { type: "application/json" })] });

  async function share() {
    const { file, stamped } = makeFile();
    try {
      await navigator.share({ files: [file], title: "LiftLog backup" });
      replaceAll(stamped);
      setMessage({ kind: "ok", text: "Backup shared." });
    } catch {
      // The user closed the share sheet: nothing to report.
    }
  }

  async function chooseFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allows choosing the same file again later
    if (!file) return;
    setMessage(null);
    setPending(null);
    const result = parseBackup(await file.text());
    if (!result.ok) return setMessage({ kind: "error", text: result.error });
    setPending({ data: result.data, exportedAt: result.exportedAt, fileName: file.name });
  }

  function confirmRestore() {
    if (!pending) return;
    replaceAll({ ...pending.data, lastBackupAt: pending.exportedAt });
    setMessage({ kind: "ok", text: "Restored. Everything from the backup is back." });
    setPending(null);
  }

  return (
    <div className="card">
      <p className="muted">
        Your workouts live only on this phone. Save a backup now and then. It protects you if you clear your browser data or change phones.
      </p>
      <p><strong>{lastBackupText(data)}</strong></p>

      <div className="row">
        <button className="primary" onClick={save}>Save backup file</button>
        {canShare && <button onClick={share}>Share backup…</button>}
      </div>

      <hr />
      <button onClick={() => fileInput.current?.click()}>Restore from backup file…</button>
      <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={chooseFile} aria-label="Choose a backup file" />

      {pending && (
        <div className="notice" role="alert">
          <p>
            <strong>{pending.fileName}</strong> has {describeData(pending.data)}, saved{" "}
            {new Date(pending.exportedAt).toLocaleDateString()}.
          </p>
          <p>Restoring <strong>replaces everything currently in the app</strong> ({describeData(data)}).</p>
          <div className="row">
            <button className="danger" onClick={confirmRestore}>Yes, replace everything</button>
            <button onClick={() => setPending(null)}>Cancel</button>
          </div>
        </div>
      )}

      {message && <p className={message.kind === "error" ? "notice" : "ok-note"} role="status">{message.text}</p>}

      <hr />
      <p className="muted">
        Want a clean start (for example after trying the app out)? This erases your logged workouts only. Your saved workouts, custom exercises and profile stay.
      </p>
      {confirmClear ? (
        <div className="row">
          <button
            className="danger"
            onClick={() => {
              replaceAll(clearHistory(data));
              setConfirmClear(false);
              setMessage({ kind: "ok", text: "Workout history cleared." });
            }}
          >
            Yes, erase {data.sessions.length} logged {data.sessions.length === 1 ? "workout" : "workouts"}
          </button>
          <button onClick={() => setConfirmClear(false)}>Keep them</button>
        </div>
      ) : (
        <button className="danger" onClick={() => setConfirmClear(true)} disabled={data.sessions.length === 0 && !data.activeSession}>
          Clear workout history…
        </button>
      )}
    </div>
  );
}
