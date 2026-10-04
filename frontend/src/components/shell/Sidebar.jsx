import React from "react";
import { ArrowLeftRight, X } from "lucide-react";
import Logo from "./Logo";
import { HOTLINE } from "../../constants";
import { NAV_ITEMS } from "./navConfig";

const ROLES = [
  { id: "kid", label: "Bé học" },
  { id: "parent", label: "Phụ huynh" },
  { id: "admin", label: "Admin" }
];

export default function Sidebar({ role, currentView, onNavigate, onSwitchRole, onGoHome, open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-vp-ink/30 lg:hidden" onClick={onClose} />}
      <aside
        data-testid="sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-70 overflow-y-auto bg-white border-r border-vp-border p-8 flex flex-col gap-10 transition-transform duration-200 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Logo onClick={onGoHome} />
          <button className="lg:hidden p-1 text-vp-ink" onClick={onClose} aria-label="Đóng menu">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          {NAV_ITEMS[role].map(({ view, label, icon: Icon }) => {
            const active = currentView === view;
            return (
              <button
                key={view}
                data-testid={`nav-${view}`}
                onClick={() => { onNavigate(view); onClose(); }}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium text-left border transition-colors ${
                  active ? "bg-vp-blue border-vp-blue text-white shadow-vp-drop" : "border-transparent text-vp-ink hover:bg-vp-sky"
                }`}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
                <span className="whitespace-nowrap">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-vp-muted">Chuyển đổi vai trò</span>
            <ArrowLeftRight className="w-[18px] h-[18px] text-vp-blue" />
          </div>
          <div className="flex h-10 items-center justify-between rounded-full bg-vp-pill p-1">
            {ROLES.map(({ id, label }) => (
              <button
                key={id}
                data-testid={`role-${id}`}
                onClick={() => { onSwitchRole(id); onClose(); }}
                className={`flex-1 h-full rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  role === id ? "bg-vp-blue text-white border-[0.5px] border-vp-line shadow-vp-drop" : "text-vp-ink hover:bg-white/70"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-vp-sky p-4 flex flex-col gap-2">
          <p className="text-sm font-bold text-vp-ink">Bạn cần hỗ trợ?</p>
          <p className="text-xs leading-[1.4] text-vp-muted">Tổng đài trợ lý giáo vụ VietPhonics luôn sẵn sàng đồng hành cùng ba mẹ.</p>
          <p className="text-xs font-bold text-vp-blue">Hotline: {HOTLINE}</p>
        </div>
      </aside>
    </>
  );
}
