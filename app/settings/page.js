"use client";

import AppShell from "../components/AppShell";
import SettingsPanel from "../components/SettingsPanel";

export default function SettingsPage() {
  return (
    <AppShell
      title="Threshold Settings"
      subtitle="Configure sensor limits, warning thresholds and alert behavior"
    >
      <SettingsPanel />
    </AppShell>
  );
}