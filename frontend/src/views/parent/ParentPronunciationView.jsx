import React, { useEffect, useState } from "react";
import { Volume2, Play } from "lucide-react";
import { Card, PageHeader } from "../../components/ui";
import { fetchPracticeHistory } from "../../services/apiService";
import { speakVietnamese } from "../../services/audioService";
import { useStore } from "../../services/store";
import ChildSwitcher from "./ChildSwitcher";

// Figma: 04 Parent UX / 04 / Screen-Pronunciation (7:1179)
const GROUPS = [
  { name: "Phụ âm đầu (s, x, tr, ch, l, n)", key: "initial" },
  { name: "Âm cuối (n, ng, t, c)", key: "final" },
  { name: "Thanh điệu sắc/hỏi/ngã đặc hữu", key: "tone" }
];

const SENSITIVITY_LABEL = (v) => (v < 34 ? "Dễ (Bé chậm nói)" : v < 67 ? "Mầm non trung bình (Mặc định)" : "Nghiêm ngặt (Bé sắp vào lớp 1)");

// % of phones the child got wrong for this kind of sound, from the real practice history (null = not enough data yet).
function deviation(child, key) {
  const accuracy = child?.category_accuracy?.[key];
  return accuracy == null ? null : 100 - accuracy;
}

export default function ParentPronunciationView({ profiles, selectedChild, onSelectChild }) {
  const { getChildSettings, setChildSettings } = useStore();
  const settings = getChildSettings(selectedChild?.id);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let alive = true;
    fetchPracticeHistory(selectedChild?.id, 20).then((h) => alive && setHistory(h));
    return () => { alive = false; };
  }, [selectedChild?.id]);

  const mistakes = history.filter((h) => h.score < 85).slice(0, 4);

  return (
    <div className="flex flex-col gap-7 max-w-[1080px]">
      <PageHeader
        subtitle="AI tổng hợp độ chệch của từng nhóm âm và cho phép ba mẹ nghe so sánh với giọng mẫu."
        actions={<ChildSwitcher profiles={profiles} selectedChild={selectedChild} onSelectChild={onSelectChild} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6 flex flex-col gap-5">
          <p className="text-lg font-bold text-vp-ink">Biểu đồ phân tích độ chệch âm tiết (từ các lần luyện của bé)</p>
          {GROUPS.map((g) => {
            const d = deviation(selectedChild, g.key);
            if (d === null) {
              return (
                <div key={g.key} className="flex flex-col gap-2" data-testid={`deviation-${g.key}`}>
                  <div className="flex flex-wrap justify-between gap-2 font-bold">
                    <span className="text-sm text-vp-ink">{g.name}</span>
                    <span className="text-[13px] text-vp-muted">Chưa đủ dữ liệu</span>
                  </div>
                  <div className="h-4 rounded-lg bg-zinc-100" />
                </div>
              );
            }
            const tone = d < 25 ? ["text-emerald-500", "bg-emerald-500", "Đạt chuẩn tốt"] : d < 40 ? ["text-amber-500", "bg-amber-400", "Khá nhạy cảm"] : ["text-red-500", "bg-red-500", "Cần can thiệp gấp"];
            return (
              <div key={g.key} className="flex flex-col gap-2" data-testid={`deviation-${g.key}`}>
                <div className="flex flex-wrap justify-between gap-2 font-bold">
                  <span className="text-sm text-vp-ink">{g.name}</span>
                  <span className={`text-[13px] ${tone[0]}`}>{tone[2]} ({d}% chệch)</span>
                </div>
                <div className="h-4 rounded-lg bg-zinc-100 overflow-hidden"><div className={`h-full rounded-lg ${tone[1]}`} style={{ width: `${d}%` }} /></div>
              </div>
            );
          })}
        </Card>

        <Card className="p-6 flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-vp-sky px-2 py-0.5 text-[10px] font-bold text-vp-blue">CHỈ DÀNH CHO CHA MẸ</span>
            <p className="text-lg font-bold text-vp-ink">Cấu hình ngưỡng nhạy AI</p>
          </div>
          <p className="text-sm leading-relaxed text-vp-muted">Ba mẹ có thể điều chỉnh độ khó của công nghệ so khớp giọng AI tùy theo khả năng nói của bé.</p>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap justify-between gap-2 text-[13px]">
              <span className="text-vp-muted">Độ khó chấm điểm phát âm</span>
              <span data-testid="sensitivity-label" className="font-bold text-vp-blue">{SENSITIVITY_LABEL(settings.sensitivity)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.sensitivity}
              onChange={(e) => setChildSettings(selectedChild.id, { sensitivity: Number(e.target.value) })}
              aria-label="Độ khó chấm điểm"
              className="w-full accent-[#1978dc] my-2"
            />
            <div className="flex justify-between text-[11px] text-vp-muted"><span>Dễ (Bé chậm nói)</span><span>Nghiêm ngặt (Bé 7 tuổi)</span></div>
          </div>
        </Card>
      </div>

      <Card className="p-6 flex flex-col gap-5">
        <p className="text-lg font-bold text-vp-ink">Các từ mẫu con mới ghi âm sai & Nghe so sánh mẫu chuẩn vùng miền</p>
        {mistakes.length === 0 && <p className="text-sm text-vp-muted">Chưa có từ nào bị chấm dưới 85% gần đây.</p>}
        {mistakes.map((m) => (
          <div key={m.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-vp-border p-4">
            <div>
              <p className="font-bold text-vp-ink">Từ khóa mục tiêu: "{m.word}" — {m.score}%</p>
              <p className="text-[13px] text-vp-muted">
                {selectedChild?.name} phát âm chệch {m.errors?.[0]?.canonical_name || "âm mục tiêu"}.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => speakVietnamese(m.word, 0.8)} className={`flex items-center gap-2 rounded-3xl border px-4 py-2 text-[13px] ${settings.region === "north" ? "border-vp-blue bg-blue-50 font-bold text-vp-blue" : "border-vp-border text-vp-ink"}`}>
                <Volume2 className="w-3.5 h-3.5" /> Mẫu Bắc chuẩn
              </button>
              <button onClick={() => speakVietnamese(m.word, 0.7)} className={`flex items-center gap-2 rounded-3xl border px-4 py-2 text-[13px] ${settings.region === "south" ? "border-vp-blue bg-blue-50 font-bold text-vp-blue" : "border-vp-border text-vp-ink"}`}>
                <Volume2 className="w-3.5 h-3.5" /> Mẫu Nam chuẩn
              </button>
              <button
                disabled
                title="Bản ghi giọng của con không được lưu lên máy chủ để bảo vệ quyền riêng tư."
                className="flex items-center gap-2 rounded-3xl border border-vp-blue bg-vp-sky px-4 py-2 text-[13px] font-bold text-vp-blue opacity-50 cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5" /> Giọng ghi của con
              </button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
