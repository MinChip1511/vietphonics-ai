import React, { useState } from "react";
import { Sparkles, Award, SmilePlus, Flame, Target, Lock, Play } from "lucide-react";
import { ProgressBar } from "../components/ui";
import { useStore } from "../services/store";

// Figma: 03 Child UX / 14 (17) / points-streak-badges (7:803)
function buildBadges(child, totalLessons) {
  const accuracy = child?.overall_accuracy ?? 0;
  const lessons = child?.completed_lessons ?? 0;
  const streak = child?.streak ?? 0;
  return [
    { id: "early", title: "Chim Non Chăm Chỉ", desc: "Học tập 3 ngày liên tiếp", icon: Sparkles, earned: streak >= 3 },
    { id: "hero", title: "Dũng Sĩ Phát Âm", desc: "Độ chính xác đạt 80%", icon: Award, earned: accuracy >= 80 },
    { id: "polite", title: "Chào Hỏi Lễ Phép", desc: "Hoàn thành bài khảo sát đầu tiên", icon: SmilePlus, earned: lessons >= 1 },
    { id: "fire", title: "Ngọn Lửa Nhỏ", desc: "Giữ chuỗi 7 ngày học", icon: Flame, earned: streak >= 7 },
    { id: "target", title: "Xạ Thủ Thanh Điệu", desc: "Hoàn thành 8 bài học", icon: Target, earned: lessons >= 8 },
    { id: "star", title: "Ngôi Sao Lớp Học", desc: "Hoàn thành toàn bộ bài học", icon: Award, earned: totalLessons > 0 && lessons >= totalLessons }
  ];
}

// The lesson that trains a weak sound family (falls back to the first lesson).
const SOUND_CATEGORY = { "Âm S - X": "initial_consonants", "Âm TR - CH": "initial_consonants", "Âm L - N": "initial_consonants", "Âm cuối N - NG": "final_consonants", "Thanh Hỏi - Ngã": "tones", "Thanh điệu": "tones" };
function lessonFor(sound, lessons) {
  return lessons.find((l) => l.category === SOUND_CATEGORY[sound]) || lessons[0];
}

const CARD = "rounded-[20px] border border-[#E4E4E7] bg-white drop-shadow-[2px_2px_8px_rgba(0,0,0,0.2)]";

export default function KidProgressView({ selectedChild, onGoToLesson }) {
  const { catalog } = useStore();
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const lessons = catalog.lessons;
  const badges = buildBadges(selectedChild, lessons.length);
  const earned = badges.filter((b) => b.earned).length;
  const needs = selectedChild?.needs_practice || [];
  const weekly = selectedChild?.weekly_progress || [];
  const shownBadges = showAllBadges ? badges : badges.slice(0, 3);
  const pill = "rounded-full bg-white/90 px-4 py-1.5 font-baloo text-sm font-bold text-[#1978DC] shadow-sm hover:bg-white";

  return (
    <div className="flex w-full max-w-[1096px] flex-col gap-8 font-baloo">
      <h2 className="font-baloo text-2xl font-extrabold leading-normal text-[#0D3577] sm:text-[32px]">Cúp Và Huy Chương Của Bé</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={`${CARD} flex flex-col gap-3 p-5 leading-normal`}>
          <p className="text-sm text-[#6B7280]">Tổng Điểm Đã Tích Lũy</p>
          <p data-testid="kid-xp" className="text-4xl font-extrabold text-[#1978DC]">{selectedChild?.stars ?? 0} XP</p>
        </div>
        <div className={`${CARD} flex flex-col gap-3 p-5 leading-normal`}>
          <p className="text-sm text-[#6B7280]">Chuỗi Ngày Liên Tiếp</p>
          <p className="text-4xl font-extrabold text-[#F59E0B]">{selectedChild?.streak ?? 0} Ngày</p>
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-baloo text-[22px] font-bold leading-normal text-[#0D3577]">Huy hiệu bé tự hào rinh được</h3>
          <span className="rounded-full bg-white/90 px-3 text-sm font-bold text-[#1978DC]">{earned}/{badges.length}</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {shownBadges.map(({ id, title, desc, icon: Icon, earned: on }) => (
            <div key={id} data-testid={`badge-${id}`} className={`${CARD} flex flex-col items-center gap-3 p-5 text-center leading-normal ${on ? "" : "bg-[#E4E4E7]"}`}>
              <div className={`grid h-16 w-16 place-items-center rounded-full ${on ? "bg-[#DDF5FF]" : "bg-white"}`}>
                {on ? <Icon className="h-8 w-8 text-[#1978DC]" strokeWidth={1.5} /> : <Lock className="h-7 w-7 text-[#6B7280]" />}
              </div>
              <p className="text-base font-bold text-[#0D3577]">{title}</p>
              <p className={`text-xs ${on ? "text-[#6B7280]" : "text-[#4B5563]"}`}>{desc}{on ? "" : " (chưa mở)"}</p>
            </div>
          ))}
        </div>
        {badges.length > 3 && (
          <div>
            <button type="button" data-testid="badges-toggle" onClick={() => setShowAllBadges((v) => !v)} className={pill}>
              {showAllBadges ? "Thu gọn" : `Xem tất cả (${badges.length})`}
            </button>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <button type="button" data-testid="more-stats-toggle" onClick={() => setShowMore((v) => !v)} className={pill}>
            {showMore ? "Ẩn thống kê chi tiết" : "Xem thống kê chi tiết"}
          </button>
        </div>
        {showMore && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={`${CARD} flex flex-col gap-4 p-6`}>
              <h3 className="font-baloo text-xl font-bold text-[#0D3577]">Độ chính xác các tuần gần đây</h3>
              <div className="flex h-36 items-end gap-3">
                {weekly.map((v, i) => (
                  <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-xs font-bold text-[#1978DC]">{v}%</span>
                    <div className="w-full rounded-t-lg bg-[#1978DC]/80" style={{ height: `${v}%` }} />
                    <span className="text-[11px] text-[#6B7280]">T{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`${CARD} flex flex-col gap-4 p-6`}>
              <h3 className="font-baloo text-xl font-bold text-[#0D3577]">Âm bé cần luyện thêm</h3>
              {needs.map((sound, i) => (
                <div key={sound} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#0D3577]">{sound}</p>
                    <ProgressBar value={Math.max(10, Math.min(100, Math.round(selectedChild?.overall_accuracy ?? 50) - 10 * i))} barClass="bg-amber-400" className="mt-1" />
                  </div>
                  <button
                    onClick={() => lessons.length > 0 && onGoToLesson(lessonFor(sound, lessons, i).id)}
                    className="flex h-8 items-center gap-1 rounded-full bg-[#1978DC] px-3 text-xs font-bold text-white"
                  >
                    <Play className="h-3 w-3" /> Luyện
                  </button>
                </div>
              ))}
              {needs.length === 0 && <p className="text-sm text-[#6B7280]">Bé đang làm rất tốt, chưa có âm nào cần luyện thêm!</p>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
