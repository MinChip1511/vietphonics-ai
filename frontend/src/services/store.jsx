/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, loadToken, saveToken, setUnauthorizedHandler } from "./apiClient";

// Client state backed by the server: the signed-in account, its children, the lesson catalogue, the
// price list and (for admins) the admin console data. Nothing here is persisted except the sign-in token.

export const DEFAULT_CHILD_SETTINGS = {
  region: "north",
  sensitivity: 50,
  consentAnalysis: true,
  consentTraining: false,
  retention: "30"
};

export function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0..4
}

const StoreContext = createContext(null);

// Runs a request and returns {ok, ...data} or {ok:false, error}, so forms can show the message directly.
async function attempt(fn) {
  try {
    return { ok: true, ...(await fn()) };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, error: err.message, status: err.status };
    throw err;
  }
}

export function StoreProvider({ children: appChildren }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [kids, setKids] = useState([]);
  const [catalog, setCatalog] = useState({ lessons: [], categories: [], loaded: false, error: null });
  const [plans, setPlans] = useState([]);
  const [adminData, setAdminData] = useState(null);
  const [adminError, setAdminError] = useState(null);
  const [expired, setExpired] = useState(false);
  const userRef = useRef(null);
  useEffect(() => { userRef.current = user; }, [user]);

  const reloadCatalog = useCallback(async () => {
    try {
      const data = await api("/lessons");
      setCatalog({ lessons: data.lessons, categories: data.categories, loaded: true, error: null });
    } catch (err) {
      setCatalog((c) => ({ ...c, loaded: true, error: err.message }));
    }
  }, []);

  const reloadPlans = useCallback(async () => {
    try {
      setPlans(await api("/plans"));
    } catch {
      // the pricing screen shows its own empty state
    }
  }, []);

  const reloadKids = useCallback(async () => {
    try {
      setKids(await api("/profiles"));
    } catch {
      setKids([]);
    }
  }, []);

  const reloadAdmin = useCallback(async () => {
    try {
      setAdminData(await api("/admin/bootstrap"));
      setAdminError(null);
    } catch (err) {
      setAdminError(err.message);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      setUser((await api("/auth/me")).user);
    } catch {
      // an expired session is handled by the unauthorized handler
    }
  }, []);

  const signOutLocal = useCallback(() => {
    saveToken(null);
    setUser(null);
    setKids([]);
    setAdminData(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (userRef.current) setExpired(true);
      signOutLocal();
    });
  }, [signOutLocal]);

  // Boot: public data first, then validate the saved token.
  useEffect(() => {
    let alive = true;
    (async () => {
      await Promise.all([reloadCatalog(), reloadPlans()]);
      if (loadToken()) {
        try {
          const { user: me } = await api("/auth/me");
          if (alive) setUser(me);
        } catch {
          saveToken(null);
        }
      }
      if (alive) setBooting(false);
    })();
    return () => { alive = false; };
  }, [reloadCatalog, reloadPlans]);

  // Load what the signed-in account needs (admin console data, or the parent's children).
  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    (async () => {
      if (user.role === "admin") await reloadAdmin();
      else if (alive) await reloadKids();
    })();
    return () => { alive = false; };
  }, [user, reloadAdmin, reloadKids]);

  const openSession = useCallback(async (data, keep = true) => {
    saveToken(data.token, keep);
    setExpired(false);
    setUser(data.user);
    return { user: data.user };
  }, []);

  const auth = useMemo(() => ({
    loginWithPassword: (email, password, keep = true) =>
      attempt(async () => openSession(await api("/auth/login", { method: "POST", body: { email, password, remember: keep } }), keep)),
    sendOtp: (phone) => attempt(() => api("/auth/otp/send", { method: "POST", body: { phone } })),
    loginWithOtp: (phone, code, keep = true) =>
      attempt(async () => openSession(await api("/auth/otp/login", { method: "POST", body: { phone, code, remember: keep } }), keep)),
    register: ({ name, phone, email, password }) =>
      attempt(async () => openSession(await api("/auth/register", { method: "POST", body: { name, phone, email, password } }))),
    resetPassword: (identifier, code, newPassword) =>
      attempt(async () => openSession(await api("/auth/password/reset", { method: "POST", body: { identifier, code, new_password: newPassword } }))),
    changePassword: (current, next) =>
      attempt(async () => openSession(await api("/auth/password/change", { method: "POST", body: { current_password: current, new_password: next } }))),
    availability: async ({ email, phone }) => {
      const query = new URLSearchParams();
      if (email) query.set("email", email);
      if (phone) query.set("phone", phone);
      try {
        return await api(`/auth/availability?${query}`);
      } catch {
        return { emailTaken: false, phoneTaken: false };
      }
    },
    logout: async () => {
      try {
        await api("/auth/logout", { method: "POST" });
      } catch {
        // the token is dropped locally anyway
      }
      signOutLocal();
    }
  }), [openSession, signOutLocal]);

  // ---- children --------------------------------------------------------------------------------
  const applyChild = useCallback((profile) => {
    setKids((list) => (list.some((k) => k.id === profile.id) ? list.map((k) => (k.id === profile.id ? profile : k)) : [...list, profile]));
  }, []);

  const addChild = useCallback((body) => attempt(async () => {
    const profile = await api("/profiles", { method: "POST", body });
    applyChild(profile);
    setUser((u) => (u ? { ...u, childIds: [...(u.childIds || []), profile.id] } : u));
    return { child: profile };
  }), [applyChild]);

  const updateChild = useCallback((id, patch) => attempt(async () => {
    const profile = await api(`/profiles/${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
    applyChild(profile);
    return { child: profile };
  }), [applyChild]);

  const deleteChild = useCallback((id) => attempt(async () => {
    await api(`/profiles/${encodeURIComponent(id)}`, { method: "DELETE" });
    setKids((list) => list.filter((k) => k.id !== id));
    return {};
  }), []);

  const getChildSettings = useCallback(
    (childId) => ({ ...DEFAULT_CHILD_SETTINGS, ...(kids.find((k) => k.id === childId)?.settings || {}) }),
    [kids]
  );
  // Optimistic: the switch moves at once; if the server refuses, the saved values come back.
  const setChildSettings = useCallback(async (childId, patch) => {
    setKids((list) => list.map((k) => (k.id === childId ? { ...k, settings: { ...k.settings, ...patch } } : k)));
    const result = await updateChild(childId, { settings: patch });
    if (!result.ok) reloadKids();
    return result;
  }, [updateChild, reloadKids]);

  // ---- admin console ---------------------------------------------------------------------------
  // Runs a write and refreshes the console data, so every screen shows what the server now holds.
  const adminRequest = useCallback(async (path, options) => {
    const result = await attempt(async () => ({ data: await api(`/admin${path}`, options) }));
    if (result.ok) {
      await reloadAdmin();
      if (path.startsWith("/lessons") || path.startsWith("/rewards")) reloadCatalog();
      if (path.startsWith("/plans")) reloadPlans();
    }
    return result;
  }, [reloadAdmin, reloadCatalog, reloadPlans]);

  const admin = useMemo(() => ({ data: adminData, error: adminError, reload: reloadAdmin, request: adminRequest }), [adminData, adminError, reloadAdmin, adminRequest]);

  const value = useMemo(() => ({
    booting, user, auth, expired, clearExpired: () => setExpired(false), refreshUser,
    kids, addChild, updateChild, deleteChild, applyChild, reloadKids, getChildSettings, setChildSettings,
    catalog, reloadCatalog, plans, reloadPlans, admin
  }), [booting, user, auth, expired, refreshUser, kids, addChild, updateChild, deleteChild, applyChild, reloadKids, getChildSettings, setChildSettings, catalog, reloadCatalog, plans, reloadPlans, admin]);

  return <StoreContext.Provider value={value}>{appChildren}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
