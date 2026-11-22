"use client";

import { useRef, useState } from "react";
import { useLearningRuntime } from "@/features/runtime/learning-runtime-provider";

export function DataBackup() {
  const runtime = useLearningRuntime();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function exportBackup() {
    if (!runtime || busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await runtime.exportData();
      const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `dutchflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Backup downloaded.");
    } catch {
      setError("DutchFlow could not export your local data.");
    } finally {
      setBusy(false);
    }
  }

  async function importBackup(file?: File) {
    if (!runtime || !file || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const serialized = await file.text();
      await runtime.importData(serialized);
      setMessage("Backup restored. Your local learning data has been replaced with the backup.");
      window.setTimeout(() => window.location.reload(), 350);
    } catch {
      setError("This backup file is invalid or unsupported. Your current data was not changed.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <section className="backup-card" aria-labelledby="backup-title">
      <div>
        <h2 id="backup-title">Your learning data</h2>
        <p>Download a JSON backup or restore one on this device. Restoring replaces the current local data.</p>
      </div>
      <div className="backup-actions">
        <button className="secondary-button" disabled={!runtime || busy} onClick={() => void exportBackup()} type="button">
          {busy ? "Working…" : "Export backup"}
        </button>
        <button className="secondary-button" disabled={!runtime || busy} onClick={() => fileInput.current?.click()} type="button">
          Import backup
        </button>
        <input
          ref={fileInput}
          accept="application/json,.json"
          aria-label="Choose DutchFlow backup file"
          className="visually-hidden"
          onChange={(event) => void importBackup(event.currentTarget.files?.[0])}
          type="file"
        />
      </div>
      {message && <p className="save-status" role="status">{message}</p>}
      {error && <p className="notice-error" role="alert">{error}</p>}
    </section>
  );
}
