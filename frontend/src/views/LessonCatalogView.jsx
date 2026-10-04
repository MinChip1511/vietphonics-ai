import React, { useState } from "react";
import { BookOpen, Lock, Clock } from "lucide-react";
import { playSoundEffect } from "../services/audioService";
import MascotBubble from "../components/MascotBubble";
import { MASCOT_NAME } from "../constants";
import { Tabs } from "../components/ui";
import { lessonStates } from "../data/lessonProgress";
import { useStore } from "../services/store";

// Figma: 03 Child UX / 03 / lesson-selection (7:122)
function StatusChip({ status, score }) {
  if (status === "done") {
    return <span className="rounded-xl bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-500">{score}%</span>;
  }
  if (status === "current") {
    return <span className="rounded-xl bg-vp-sky px-2.5 py-1 text-[11px] font-bold text-vp-blue">Đang học</span>;
  }
  if (status === "locked") return <span className="text-[11px] text-vp-muted">Khóa</span>;
  return <span className="text-[11px] font-semibold text-vp-blue">Mới</span>;
}

export default function LessonCatalogView({ onSelectLesson, initialCategory = "all", selectedChild }) {
  const { catalog } = useStore();
  const [category, setCategory] = useState(initialCategory);
  const tabs = catalog.categories.map((c) => ({ id: c.id, label: c.id === "all" ? "Tất cả" : c.name.replace(/^Level \d+: /, "") }));
  const states = lessonStates(catalog.lessons, selectedChild);

  const lessons = catalog.lessons
    .map((lesson, index) => ({ lesson, index, status: states[lesson.id] }))
    .filter(({ lesson }) => category === "all" || lesson.category === category);

  return (
    <div className="flex flex-col gap-6 max-w-[1096px]">
      <MascotBubble
        name={MASCOT_NAME}
        message="Bé hãy chọn một bài học màu xanh rực rỡ để bắt đầu thử thách tiếp theo nhé!"
      />

      <Tabs tabs={tabs} value={category} onChange={setCategory} />
      {catalog.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-500">{catalog.error}</p>}
      {catalog.loaded && !catalog.error && lessons.length === 0 && <p className="text-vp-muted">Chưa có bài học nào trong nhóm này.</p>}

      <div className="grid gap-5 sm:grid-cols-2" data-testid="lesson-grid">
        {lessons.map(({ lesson, index, status }) => {
          const locked = status === "locked";
          const score = selectedChild?.progress?.[lesson.id]?.best ?? 0;
          return (
            <button
              key={lesson.id}
              data-testid={`lesson-${lesson.id}`}
              disabled={locked}
              onClick={() => { playSoundEffect("click"); onSelectLesson(lesson.id, category); }}
              className={`flex flex-col gap-4 rounded-3xl bg-white p-6 text-left shadow-[0_4px_6px_rgba(30,27,75,0.02)] transition ${
                status === "current" ? "border-[2.5px] border-vp-blue" : "border border-vp-border hover:border-vp-blue"
              } ${locked ? "opacity-65 cursor-not-allowed hover:border-vp-border" : ""}`}
            >
              <div className={`h-[140px] w-full rounded-2xl grid place-items-center ${locked ? "bg-vp-border" : "bg-vp-sky"}`}>
                {locked ? (
                  <Lock className="w-12 h-12 text-slate-400" strokeWidth={1.5} />
                ) : (
                  <span className="text-5xl" aria-hidden="true">{lesson.icon || <BookOpen className="w-12 h-12 text-vp-blue" />}</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-vp-muted">BÀI {index + 1}</span>
                  <StatusChip status={status} score={score} />
                </div>
                <p className={`font-heading text-xl font-extrabold ${locked ? "text-slate-500" : "text-vp-ink"}`}>
                  {lesson.title.replace(/^Bài \d+: /, "")}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-vp-muted">
                  <Clock className="w-3.5 h-3.5" /> {lesson.duration} · {lesson.difficulty} · {lesson.categoryName}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
