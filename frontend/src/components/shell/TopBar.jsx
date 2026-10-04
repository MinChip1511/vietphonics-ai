import React from "react";
import { Flame, Sparkles, Search, Bell, User, Menu, ArrowLeft } from "lucide-react";
import Logo from "./Logo";

export function SearchBox({ className = "" }) {
  return (
    <label className={`flex items-center h-11 w-[215px] rounded-full bg-vp-pill/90 pl-4 pr-3 ${className}`}>
      <input className="flex-1 min-w-0 bg-transparent text-base text-vp-ink placeholder:text-vp-ink outline-none" placeholder="Search.." />
      <Search className="w-4 h-4 text-vp-blue" strokeWidth={2.5} />
    </label>
  );
}

function RoundIcon({ label, onClick, children, className = "grid" }) {
  return (
    <button onClick={onClick} aria-label={label} className={`w-[39px] h-[39px] shrink-0 rounded-full bg-vp-blue text-white place-items-center hover:brightness-110 ${className}`}>
      {children}
    </button>
  );
}

// Figma TopBar variant "Menu" (node 27:2437): used inside the sidebar shell.
export default function TopBar({ title, child, showStats, onBack, onOpenMenu, onOpenAccount }) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-vp-border flex items-center gap-4 px-4 py-4 lg:px-8 lg:py-5">
      <button className="lg:hidden p-1 text-vp-ink" onClick={onOpenMenu} aria-label="Mở menu" data-testid="menu-toggle">
        <Menu className="w-6 h-6" />
      </button>
      {onBack && (
        <button onClick={onBack} aria-label="Quay lại" className="hidden sm:grid w-12 h-12 shrink-0 place-items-center rounded-3xl bg-vp-blue text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
      <h1 className="font-heading text-xl lg:text-2xl font-extrabold text-vp-ink truncate">{title}</h1>

      {showStats && child && (
        <div className="hidden md:flex items-center gap-4 mx-auto">
          <span data-testid="pill-streak" className="flex items-center gap-2 whitespace-nowrap rounded-[20px] bg-amber-100 px-4 py-2 text-sm font-bold text-amber-500">
            <Flame className="w-[18px] h-[18px]" /> {child.streak ?? 0} NGÀY
          </span>
          <span data-testid="pill-points" className="flex items-center gap-2 whitespace-nowrap rounded-[20px] bg-vp-sky px-4 py-2 text-sm font-bold text-vp-blue">
            <Sparkles className="w-[18px] h-[18px]" /> {child.stars ?? 0} ĐIỂM
          </span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2.5">
        <SearchBox className="hidden xl:flex" />
        <RoundIcon label="Thông báo"><Bell className="w-4 h-4" fill="currentColor" /></RoundIcon>
        <RoundIcon label="Tài khoản" onClick={onOpenAccount}><User className="w-5 h-5" fill="currentColor" /></RoundIcon>
      </div>
    </header>
  );
}

// Figma TopBar variant "Variant2" (node 99:3852): public header for landing and auth pages.
export function PublicTopBar({ onGoHome, onLogin, onSignup, user, onOpenAccount }) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-vp-border">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-2 px-3 sm:px-4 py-4 lg:px-8 lg:py-5">
        <Logo onClick={onGoHome} />
        <div className="flex items-center gap-2.5">
          <SearchBox className="hidden md:flex" />
          {!user && (
            <>
              <button data-testid="header-signup" onClick={onSignup} className="flex h-10 items-center rounded-full px-2.5 sm:px-4 font-semibold text-vp-ink hover:bg-vp-sky whitespace-nowrap">Đăng ký</button>
              <button data-testid="header-login" onClick={onLogin} className="flex h-10 items-center rounded-full px-2.5 sm:px-4 font-semibold text-vp-ink hover:bg-vp-sky whitespace-nowrap">Đăng nhập</button>
            </>
          )}
          <RoundIcon label="Tài khoản" className={user ? "grid" : "hidden sm:grid"} onClick={user ? onOpenAccount : onLogin}><User className="w-5 h-5" fill="currentColor" /></RoundIcon>
        </div>
      </div>
    </header>
  );
}
