import React, { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { VIEW_ROLE, VIEW_TITLE, VIEW_BACK } from "./navConfig";

export default function AppShell({ currentView, onNavigate, onSwitchRole, onGoHome, onOpenAccount, selectedChild, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const role = VIEW_ROLE[currentView] || "kid";
  const backTo = VIEW_BACK[currentView];

  return (
    <div className="min-h-screen bg-vp-canvas font-vp text-vp-ink">
      <Sidebar
        role={role}
        currentView={currentView}
        onNavigate={onNavigate}
        onSwitchRole={onSwitchRole}
        onGoHome={onGoHome}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="lg:pl-70 min-w-0">
        <TopBar
          title={VIEW_TITLE[currentView] || ""}
          child={selectedChild}
          showStats={role === "kid"}
          onBack={backTo ? () => onNavigate(backTo) : undefined}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenAccount={onOpenAccount}
        />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
