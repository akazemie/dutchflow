"use client";

import { PreferencesForm } from "@/features/preferences/preferences-form";
import { DataBackup } from "@/features/preferences/data-backup";
import { useI18n } from "@/features/i18n/i18n-provider";

export default function SettingsPage() {
  const { t } = useI18n();

  return (
    <div className="settings-shell">
      <div className="learning-intro">
        <span className="eyebrow">{t("settings.eyebrow")}</span>
        <p>{t("settings.intro")}</p>
      </div>
      <section aria-labelledby="settings-title" className="settings-heading">
        <h1 id="settings-title">{t("settings.title")}</h1>
        <p>{t("settings.description")}</p>
      </section>
      <PreferencesForm />
      <DataBackup />
    </div>
  );
}
