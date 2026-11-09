import { useState } from "react";

type SettingsTab = "content" | "domain" | "sellers";

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: "content", label: "Algemene content" },
  { id: "domain", label: "Domeininstellingen" },
  { id: "sellers", label: "Verkopersconnecties" },
];

export function GeneralSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("content");

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Algemene instellingen</h1>
          <p>Instellingen voor jouw entiteit.</p>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Instellingen secties">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={activeTab === tab.id ? "tab active" : "tab"}
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="empty">Meer instellingen volgen later.</div>
      </div>
    </div>
  );
}
