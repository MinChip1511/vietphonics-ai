import React, { useEffect, useState } from "react";
import { Card, PageHeader } from "../../components/ui";
import { fetchPracticeHistory } from "../../services/apiService";
import { useStore } from "../../services/store";
import ChildSwitcher from "./ChildSwitcher";
import { timeAgo, scoreTone } from "./parentUtils";

// Figma: 04 Parent UX / 03 / Screen-Progress (7:1070)
const CHAPTERS = [
  { title: "Khảo sát & Âm đầu", categories: ["diagnostic", "initial_consonants"] },
  { title: "Âm cuối & Thanh dấu", categories: ["final_consonants", "tones"] },
  { title: "Tập đọc câu đơn ngắn", categories: ["sentences"] }
];

export default function ParentProgressView({ profiles, selectedChild, onSelectChild }) {
  const { catalog } = useStore();
  const lessons = catalog.lessons;
  const [history, setHistory] = useState(null);
  const completed = selectedChild?.completed_lessons ?? 0;

  useEffect(() => {
    let alive = true;
    fetchPracticeHistory(selectedChild?.id, 15).then((h) => alive && setHistory(h));
    return () => { alive = false; };
  }, [selectedChild?.id]);

  const chapterState = CHAPTERS.map((ch) => {
    const inChapter = lessons.filter((l) => ch.categories.includes(l.category));
    const done = inChapter.filter((l) => selectedChild?.progress?.[l.id]?.completed).length;
    return { ...ch, done, total: inChapter.length, pct: inChapter.length ? Math.round((done / inChapter.length) * 100) : 0 };
  });
  const current = chapterState.find((c) => c.pct < 100) || chapterState[chapterState.length - 1];
  const currentIndex = chapterState.indexOf(current);

  return (
    <div className="flex flex-col gap-7 max-w-[1080px]">
      <PageHeader
        subtitle="Lộ trình từng chương và lịch sử từng lần luyện phát âm được AI chấm điểm."
        actions={<ChildSwitcher profiles={profiles} selectedChild={selectedChild} onSelectChild={onSelectChild} />}
      />

      <Card className="p-6 flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex flex-col gap-2 lg:w-[380px] shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-vp-sky px-2 py-0.5 text-[10px] font-bold text-vp-blue">CHƯƠNG HIỆN TẠI</span>
            <span className="text-[13px] text-vp-muted">{selectedChild?.name} • {selectedChild?.age} tuổi</span>
          </div>
          <p className="font-heading text-[22px] font-extrabold text-vp-ink leading-tight">Chương {currentIndex + 1}: {current.title}</p>
          <p className="text-sm text-vp-muted">Đã hoàn thành {completed}/{lessons.length} bài học của toàn khóa.</p>
        </div>
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          {chapterState.map((ch, i) => {
            const state = ch.pct >= 100 ? "done" : i === currentIndex ? "current" : "next";
            const color = { done: "text-emerald-500", current: "text-vp-blue", next: "text-vp-muted" }[state];
            const bar = { done: "bg-emerald-500", current: "bg-vp-blue", next: "bg-zinc-100" }[state];
            const label = { done: "ĐÃ XONG", current: "ĐANG HỌC", next: "TIẾP THEO" }[state];
            return (
              <div key={ch.title} className="flex flex-col gap-1.5">
                <p className={`text-[11px] font-bold ${color}`}>0{i + 1} / {label}</p>
                <div className="h-2 rounded bg-zinc-100 overflow-hidden"><div className={`h-full ${bar}`} style={{ width: state === "next" ? "0%" : `${Math.max(ch.pct, 8)}%` }} /></div>
                <p className={`text-[13px] ${state === "next" ? "font-medium text-vp-muted" : "font-bold text-vp-ink"}`}>{ch.title} ({ch.done}/{ch.total})</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 flex flex-col gap-5">
        <p className="text-lg font-bold text-vp-ink">Bảng chi tiết lịch sử học vần</p>
        <div className="overflow-x-auto rounded-xl border border-vp-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-[#faf9f5] text-left text-[13px] text-vp-ink">
              <tr>
                {["Từ đã luyện", "Ngày học gần nhất", "Trạng thái AI", "Điểm chuẩn xác", "Ghi chú ngữ âm"].map((h) => (
                  <th key={h} className="px-5 py-3.5 font-bold border-b border-vp-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history === null && <tr><td colSpan={5} className="px-5 py-6 text-center text-vp-muted">Đang tải lịch sử...</td></tr>}
              {history?.length === 0 && <tr><td colSpan={5} className="px-5 py-6 text-center text-vp-muted">Bé chưa có lần luyện nào. Hãy cùng bé học bài đầu tiên nhé!</td></tr>}
              {history?.map((h) => {
                const tone = scoreTone(h.score);
                const err = h.errors?.[0];
                return (
                  <tr key={h.id} className="border-b border-vp-border last:border-0">
                    <td className="px-5 py-4 font-semibold text-vp-ink">{h.word}</td>
                    <td className="px-5 py-4 text-vp-muted whitespace-nowrap">{timeAgo(h.created_at)}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${tone.chip}`}>{tone.label}</span></td>
                    <td className={`px-5 py-4 font-bold ${tone.text}`}>{h.score}%</td>
                    <td className="px-5 py-4 text-[13px] text-vp-muted">
                      {err ? `Cần chú ý ${err.canonical_name || err.expected || "âm mục tiêu"}.` : "Tròn vành rõ âm, đạt chuẩn."}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
