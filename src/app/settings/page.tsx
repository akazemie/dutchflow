import { PreferencesForm } from "@/features/preferences/preferences-form";

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
    </div>
  );
}
