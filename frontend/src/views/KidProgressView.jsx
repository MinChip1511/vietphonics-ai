import React from "react";
import { Sparkles, Award, SmilePlus, Flame, Target, Lock, Play } from "lucide-react";
import { Card, ProgressBar } from "../components/ui";
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

export default function KidProgressView({ selectedChild, onGoToLesson }) {
  const { catalog } = useStore();
  const lessons = catalog.lessons;
  const badges = buildBadges(selectedChild, lessons.length);
  const earned = badges.filter((b) => b.earned).length;
  const needs = selectedChild?.needs_practice || [];
  const weekly = selectedChild?.weekly_progress || [];

  return (
    <div className="flex flex-col gap-8 max-w-[1096px]">
      <h2 className="font-heading text-2xl sm:text-[32px] font-extrabold text-vp-ink">Cúp Và Huy Chương Của Bé</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5 flex flex-col gap-3">
          <p className="text-sm text-vp-muted">Tổng Điểm Đã Tích Lũy</p>
          <p data-testid="kid-xp" className="font-heading text-4xl font-extrabold text-vp-blue">{selectedChild?.stars ?? 0} XP</p>
        </Card>
        <Card className="p-5 flex flex-col gap-3">
          <p className="text-sm text-vp-muted">Chuỗi Ngày Liên Tiếp</p>
          <p className="font-heading text-4xl font-extrabold text-amber-500">{selectedChild?.streak ?? 0} Ngày</p>
        </Card>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-[22px] font-bold text-vp-ink">Huy hiệu bé tự hào rinh được</h3>
          <span className="text-sm font-bold text-vp-blue">{earned}/{badges.length}</span>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {badges.map(({ id, title, desc, icon: Icon, earned: on }) => (
            <Card key={id} className={`p-5 flex flex-col items-center gap-3 text-center ${on ? "" : "opacity-55"}`}>
              <div className={`w-16 h-16 rounded-full grid place-items-center ${on ? "bg-vp-sky" : "bg-vp-border"}`}>
                {on ? <Icon className="w-8 h-8 text-vp-blue" strokeWidth={1.5} /> : <Lock className="w-7 h-7 text-slate-400" />}
              </div>
              <p className="font-bold text-vp-ink">{title}</p>
              <p className="text-xs text-vp-muted">{desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6 flex flex-col gap-4">
          <h3 className="font-heading text-xl font-bold text-vp-ink">Độ chính xác các tuần gần đây</h3>
          <div className="flex items-end gap-3 h-36">
            {weekly.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-vp-blue">{v}%</span>
                <div className="w-full rounded-t-lg bg-vp-blue/80" style={{ height: `${v}%` }} />
                <span className="text-[11px] text-vp-muted">T{i + 1}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6 flex flex-col gap-4">
          <h3 className="font-heading text-xl font-bold text-vp-ink">Âm bé cần luyện thêm</h3>
          {needs.map((sound, i) => (
            <div key={sound} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-vp-ink">{sound}</p>
                <ProgressBar value={Math.max(10, Math.min(100, Math.round(selectedChild?.overall_accuracy ?? 50) - 10 * i))} barClass="bg-amber-400" className="mt-1" />
              </div>
              <button
                onClick={() => lessons.length > 0 && onGoToLesson(lessonFor(sound, lessons, i).id)}
                className="flex items-center gap-1 rounded-full bg-vp-blue px-3 h-8 text-xs font-bold text-white"
              >
                <Play className="w-3 h-3" /> Luyện
              </button>
            </div>
          ))}
          {needs.length === 0 && <p className="text-sm text-vp-muted">Bé đang làm rất tốt, chưa có âm nào cần luyện thêm!</p>}
        </Card>
      </div>
    </div>
  );
}
