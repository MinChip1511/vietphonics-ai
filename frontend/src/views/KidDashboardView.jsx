import React from "react";
import { Play, Mic, Music, ArrowDownToLine, BookOpen, Trophy, ChevronRight } from "lucide-react";
import { playSoundEffect } from "../services/audioService";
import { useStore } from "../services/store";
import { nextLesson } from "../data/lessonProgress";
import MascotBubble from "../components/MascotBubble";
import { Card, SectionTitle } from "../components/ui";

// Figma: 03 Child UX / 02 / child-home (7:50)
const PROGRAMS = [
  { id: "initial_consonants", name: "Âm đầu (S/X, TR/CH, L/N)", desc: "Luyện mở khẩu hình chuẩn.", icon: Mic, bg: "bg-vp-sky" },
  { id: "tones", name: "Thanh sắc, huyền, hỏi...", desc: "Chỉnh phát âm chuẩn dấu tiếng Việt.", icon: Music, bg: "bg-blue-50" },
  { id: "final_consonants", name: "Âm cuối (N/NG, T/C)", desc: "Giữ âm cuối tròn vành, rõ chữ.", icon: ArrowDownToLine, bg: "bg-vp-sky" },
  { id: "all", name: "Kho bài tập", desc: "Tất cả bài luyện tương tác.", icon: BookOpen, bg: "bg-blue-50" }
];

export default function KidDashboardView({ selectedChild, onStartLesson, onViewAllLessons, onViewRewards }) {
  const { catalog } = useStore();
  const lessons = catalog.lessons;
  const lesson = nextLesson(lessons, selectedChild);
  if (!lesson) {
    return <p className="text-vp-muted" data-testid="no-lessons">{catalog.error || "Chưa có bài học nào được xuất bản."}</p>;
  }
  const totalWords = lesson.words?.length || 0;
  const doneWords = selectedChild?.progress?.[lesson.id]?.passed ?? 0;
  const childName = selectedChild?.name || "bé";
  const greeting = `Hôm nay ${childName} siêu thế! Chúng ta cùng hoàn thành ${lesson.title.replace(/^Bài \d+: /, "bài ")} để rinh cúp vàng nhé.`;

  return (
    <div className="flex flex-col gap-8 max-w-[1096px]">
      <MascotBubble message={greeting} />

      {/* Next lesson */}
      <div className="rounded-3xl border-[1.5px] border-vp-blue bg-vp-sky p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-vp-blue px-2 py-1 text-[11px] font-bold text-white">BÀI TIẾP THEO</span>
            <span className="text-sm font-semibold text-vp-blue">Tiến độ: {doneWords}/{totalWords} từ vựng</span>
          </div>
          <p className="font-heading text-2xl sm:text-[32px] font-extrabold text-vp-ink leading-tight">{lesson.title}</p>
          <p className="text-base text-vp-muted">{lesson.description}</p>
        </div>
        <button
          data-testid="continue-lesson"
          onClick={() => { playSoundEffect("click"); onStartLesson(lesson.id, lesson.category); }}
          className="self-start md:self-auto flex items-center gap-2 rounded-3xl bg-vp-blue px-8 py-4 text-base font-bold text-white hover:brightness-110"
        >
          Học tiếp <Play className="w-5 h-5" />
        </button>
      </div>

      {/* Programs */}
      <section>
        <SectionTitle
          action={
            <button onClick={onViewAllLessons} className="flex items-center gap-1 text-sm font-semibold text-vp-blue hover:underline">
              Tất cả bài học <ChevronRight className="w-4 h-4" />
            </button>
          }
        >
          Chương trình học vần
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          {PROGRAMS.map(({ id, name, desc, icon: Icon, bg }) => (
            <Card
              as="button"
              key={id}
              onClick={() => {
                playSoundEffect("click");
                const first = lessons.find((l) => l.category === id);
                if (first) onStartLesson(first.id, id);
                else onViewAllLessons();
              }}
              className="p-5 flex flex-col gap-3 text-left hover:border-vp-blue transition-colors"
            >
              <div className={`h-[120px] w-full rounded-xl ${bg} grid place-items-center`}>
                <Icon className="w-12 h-12 text-vp-blue" strokeWidth={1.5} />
              </div>
              <p className="text-lg font-bold text-vp-ink">{name}</p>
              <p className="text-sm text-vp-muted">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <button
        onClick={onViewRewards}
        className="flex items-center justify-between gap-4 rounded-3xl bg-vp-ink px-6 py-5 text-left text-white hover:brightness-110"
      >
        <span className="flex items-center gap-3">
          <Trophy className="w-7 h-7 text-amber-300" />
          <span className="font-semibold">Đọc đúng từ (từ 70 điểm) để nhận thêm 15 điểm và giữ chuỗi ngày học!</span>
        </span>
        <ChevronRight className="w-5 h-5 shrink-0" />
      </button>
    </div>
  );
}
