import { useState } from "react";

export function todayLabel() {
  return new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function useToast() {
  const [state, setState] = useState({ message: null, tone: "ok" });
  return {
    message: state.message,
    tone: state.tone,
    show: (message) => setState({ message, tone: "ok" }),
    fail: (message) => setState({ message, tone: "error" }),
    clear: () => setState({ message: null, tone: "ok" })
  };
}

// Runs an admin write and reports the outcome in the toast; returns the server data or null on failure.
export async function runAdmin(admin, toast, path, options, successMessage) {
  const result = await admin.request(path, options);
  if (!result.ok) {
    toast.fail(result.error);
    return null;
  }
  if (successMessage) toast.show(successMessage);
  return result.data;
}

export const selectClass = "h-10 rounded-xl border border-vp-border bg-white px-3 text-sm text-vp-ink outline-none focus:border-vp-blue";
