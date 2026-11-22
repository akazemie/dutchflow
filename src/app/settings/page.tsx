import { PreferencesForm } from "@/features/preferences/preferences-form";
import { DataBackup } from "@/features/preferences/data-backup";

export default function SettingsPage() {
  return (
    <div className="settings-shell">
      <div className="learning-intro">
        <span className="eyebrow">YOUR LEARNING SETUP</span>
        <p>Choose settings that fit your day.</p>
      </div>
      <section aria-labelledby="settings-title" className="settings-heading">
        <h1 id="settings-title">Preferences</h1>
        <p>Your choices are saved locally on this device.</p>
      </section>
      <PreferencesForm />
      <DataBackup />
    </div>
  );
}
