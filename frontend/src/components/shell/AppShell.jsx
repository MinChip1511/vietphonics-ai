import React, { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { VIEW_ROLE, VIEW_TITLE, VIEW_BACK } from "./navConfig";
import { VIEW_BACKGROUND } from "./backgrounds";

export default function AppShell({ currentView, title, scene, onNavigate, onSwitchRole, onGoHome, onOpenAccount, selectedChild, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const role = VIEW_ROLE[currentView] || "kid";
  const backTo = VIEW_BACK[currentView];
  const bg = role === "kid" ? VIEW_BACKGROUND[scene || currentView] : null;

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
      {bg && (
        <div
          aria-hidden
          data-testid="page-background"
          className="pointer-events-none fixed inset-y-0 right-0 left-0 lg:left-70 z-0 overflow-hidden bg-no-repeat"
          style={{ backgroundColor: bg.color, backgroundImage: `url(${bg.image})`, backgroundSize: bg.size, backgroundPosition: bg.position }}
        />
      )}
      <div className="lg:pl-70 min-w-0 relative z-10">
        <TopBar
          title={title ?? VIEW_TITLE[currentView] ?? ""}
          child={selectedChild}
          showStats={role === "kid"}
          onBack={backTo ? () => onNavigate(backTo) : undefined}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenAccount={onOpenAccount}
        />
        <main className={`p-4 sm:p-6 ${role === "parent" ? "lg:p-10" : "lg:p-8"}`}>{children}</main>
      </div>
    </div>
  );
}
