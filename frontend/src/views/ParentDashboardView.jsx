import React, { useEffect, useState } from "react";
import { Card, PageHeader } from "../components/ui";
import { fetchPracticeHistory } from "../services/apiService";
import { useStore } from "../services/store";
import ChildSwitcher from "./parent/ChildSwitcher";
import { timeAgo, scoreTone } from "./parent/parentUtils";

// Figma: 04 Parent UX / 02 / Screen-Dashboard (7:954)
const FOCUS_AREAS = {
  "Âm S - X": { title: "Âm đầu 's' / 'x' (Ví dụ: ngôi sao, xe đạp)", note: "Bé hay đọc 's' uốn lưỡi thành 'x' thẳng lưỡi (sao -> xao).", lesson: "lesson-s-x" },
  "Âm TR - CH": { title: "Âm đầu 'tr' / 'ch' (Ví dụ: trăng, chăn)", note: "Bé chưa bật hơi đủ ở 'tr' (trăng -> chăng).", lesson: "lesson-tr-ch" },
  "Âm cuối N - NG": { title: "Âm cuối 'ng' (Ví dụ: vầng, măng)", note: "Bé hay nuốt chữ cái 'g' thành 'n' (vầng -> vần).", lesson: "lesson-final-n-ng" },
  "Thanh Hỏi - Ngã": { title: "Thanh ngã (~) (Ví dụ: quả vẽ, con muỗi)", note: "Có xu hướng biến thanh ngã thành hỏi (vẽ -> vẻ).", lesson: "lesson-tones-hoi-nga" },
  "Âm L - N": { title: "Âm đầu 'l' / 'n' (Ví dụ: quả na, lá cây)", note: "Bé còn nói nhịu l/n khi đọc nhanh.", lesson: "lesson-l-n" },
  "Thanh điệu": { title: "Thanh sắc / huyền (Ví dụ: cá, cà)", note: "Cao độ thanh chưa ổn định khi đọc liền.", lesson: "lesson-tones-ngang-sac" }
};

export default function ParentDashboardView({ profiles, selectedChild, onSelectChild, onPracticeLesson }) {
  const { user, getChildSettings } = useStore();
  const [history, setHistory] = useState([]);
  const child = selectedChild || {};
  const settings = getChildSettings(child.id);

  useEffect(() => {
    let alive = true;
    fetchPracticeHistory(child.id, 10).then((h) => alive && setHistory(h));
    return () => { alive = false; };
  }, [child.id]);

  const weekly = child.weekly_progress || [];
  const thisWeek = weekly[weekly.length - 1] ?? child.overall_accuracy ?? 0;
  const lastWeek = weekly[weekly.length - 2] ?? thisWeek;
  const delta = thisWeek - lastWeek;
  const focus = (child.needs_practice || []).map((n, i) => ({ key: n, ...(FOCUS_AREAS[n] || { title: n, note: "AI phát hiện bé cần luyện thêm nhóm âm này.", lesson: "lesson-0" }), off: 42 - i * 14 }));
  const parentName = user?.name ? `Ba Mẹ ${child.name?.replace(/^Bé /, "") || ""}` : "Ba Mẹ";

  const activity = [
    ...history.slice(0, 2).map((h) => ({
      dot: h.score >= 85 ? "bg-emerald-500" : h.score >= 60 ? "bg-amber-500" : "bg-red-500",
      title: `Luyện từ "${h.word}" - Phát âm đạt ${h.score}%`,
      meta: `${timeAgo(h.created_at)} • ${scoreTone(h.score).label}`
    })),
    {
      dot: "bg-vp-blue",
      title: settings.consentAnalysis ? `Ba mẹ đã kích hoạt Quyền riêng tư của ${child.name}` : "Phân tích AI đang tắt cho hồ sơ này",
      meta: "Bản ghi giọng của bé không được lưu trên máy chủ"
    }
  ];

  return (
    <div className="flex flex-col gap-7 max-w-[1080px]">
      <PageHeader
        title={`Chào mừng ${parentName} trở lại!`}
        subtitle={`Báo cáo phân tích tự động từ trợ lý AI dựa trên ${history.length} lần ghi âm phát âm gần đây của con.`}
        actions={<ChildSwitcher profiles={profiles} selectedChild={selectedChild} onSelectChild={onSelectChild} />}
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5 rounded-2xl flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase text-vp-muted">Tiến trình tuần này</p>
          <p className="font-heading text-[28px] font-extrabold text-vp-ink">{thisWeek}%</p>
          <div className="h-1.5 w-32 rounded bg-zinc-100 overflow-hidden"><div className="h-full bg-vp-blue" style={{ width: `${thisWeek}%` }} /></div>
          <p className={`text-xs font-semibold ${delta >= 0 ? "text-emerald-500" : "text-red-500"}`}>{delta >= 0 ? "+" : ""}{delta}% so với tuần trước</p>
        </Card>
        <Card className="p-5 rounded-2xl flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase text-vp-muted">Chuỗi ngày học liên tiếp</p>
          <p className="flex items-baseline gap-2 text-vp-blue"><span className="font-heading text-[28px] font-extrabold">{child.streak} ngày</span><span className="text-sm font-bold">🔥 Chăm chỉ</span></p>
          <p className="text-xs text-vp-muted">{child.name} đang xếp top 35% độ chăm chỉ toàn khóa học.</p>
        </Card>
        <Card className="p-5 rounded-2xl flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase text-vp-muted">Tỉ lệ phát âm chuẩn AI</p>
          <p className="font-heading text-[28px] font-extrabold text-emerald-500">{child.overall_accuracy}%</p>
          <p className="text-xs text-vp-muted">Độ nhạy AI thiết lập phù hợp với trẻ {child.age} tuổi.</p>
        </Card>
        <Card className="p-5 rounded-2xl flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase text-vp-muted">Cúp & Huy hiệu tích lũy</p>
          <p className="font-heading text-[28px] font-extrabold text-amber-500">{child.stars} Sao</p>
          <p className="text-xs text-vp-muted">Đã đủ điều kiện quy đổi {Math.floor((child.stars || 0) / 100)} phần quà trong Kho phần thưởng.</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-vp-ink">Phân tích ngữ âm AI khuyên luyện thêm</p>
              <p className="text-[13px] text-vp-muted">Các nhóm âm tiết {child.name} đang phát âm lệch nhiều nhất tuần qua.</p>
            </div>
            <span className="shrink-0 rounded-lg bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-500">PHASE 2 DIAGNOSIS</span>
          </div>
          <div className="flex flex-col gap-3">
            {focus.map((f) => (
              <div key={f.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-vp-canvas p-4">
                <div className="min-w-0">
                  <p className="font-bold text-vp-ink">{f.title}</p>
                  <p className="text-xs text-vp-muted">{f.note}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-sm font-bold ${f.off >= 35 ? "text-red-500" : "text-amber-500"}`}>Lệch {Math.max(f.off, 12)}%</span>
                  <button onClick={() => onPracticeLesson(f.lesson)} className="rounded-full bg-vp-blue px-3 py-1.5 text-[11px] font-bold text-white">Luyện ngay</button>
                </div>
              </div>
            ))}
            {focus.length === 0 && <p className="text-sm text-vp-muted">Chưa phát hiện nhóm âm nào cần can thiệp. Tuyệt vời!</p>}
          </div>
        </Card>
        <Card className="p-6 flex flex-col gap-5">
          <p className="text-lg font-bold text-vp-ink">Hoạt động gần đây của bé</p>
          <div className="flex flex-col gap-4">
            {activity.map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 shrink-0 rounded-full ${a.dot}`} />
                <div>
                  <p className="text-sm font-semibold text-vp-ink">{a.title}</p>
                  <p className="text-[11px] text-vp-muted">{a.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
