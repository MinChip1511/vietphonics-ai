// The server stores UTC timestamps ("2026-10-03 08:00:00" or "...Z"): read them as UTC, show relative time.
export function timeAgo(iso) {
  const text = String(iso).replace(" ", "T");
  const t = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(text) ? text : `${text}Z`).getTime();
  if (Number.isNaN(t)) return String(iso);
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} phút trước`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Hôm qua" : `${days} ngày trước`;
}

export function scoreTone(score) {
  if (score >= 85) return { text: "text-emerald-500", chip: "bg-emerald-50 text-emerald-500", label: "Đã hoàn thành" };
  if (score >= 60) return { text: "text-amber-500", chip: "bg-amber-100 text-amber-500", label: "Cần luyện thêm" };
  return { text: "text-red-500", chip: "bg-red-50 text-red-500", label: "Lỗi phát âm nặng" };
}
