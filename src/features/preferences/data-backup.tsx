"use client";

import { useRef, useState } from "react";
import { useLearningRuntime } from "@/features/runtime/learning-runtime-provider";
import { useI18n } from "@/features/i18n/i18n-provider";

export function DataBackup() {
  const runtime = useLearningRuntime();
  const { t } = useI18n();
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
      setMessage(t("backup.downloaded"));
    } catch {
      setError(t("backup.error.export"));
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
      setMessage(t("backup.restored"));
      window.setTimeout(() => window.location.reload(), 350);
    } catch {
      setError(t("backup.error.import"));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <section className="backup-card" aria-labelledby="backup-title">
      <div>
        <h2 id="backup-title">{t("backup.title")}</h2>
        <p>{t("backup.description")}</p>
      </div>
      <div className="backup-actions">
        <button className="secondary-button" disabled={!runtime || busy} onClick={() => void exportBackup()} type="button">
          {busy ? t("backup.working") : t("backup.export")}
        </button>
        <button className="secondary-button" disabled={!runtime || busy} onClick={() => fileInput.current?.click()} type="button">
          {t("backup.import")}
        </button>
        <input
          ref={fileInput}
          accept="application/json,.json"
          aria-label={t("backup.fileLabel")}
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
