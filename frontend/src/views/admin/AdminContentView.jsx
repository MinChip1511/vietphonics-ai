import React, { useState } from "react";
import { PlayCircle } from "lucide-react";
import { Card, Field, Modal, Button, inputClass } from "../../components/ui";
import { useStore } from "../../services/store";
import { speakVietnamese } from "../../services/audioService";
import { LESSON_STATUS } from "../../data/adminLabels";
import { AdminHeader, AdminLoading, StatusBadge, Toast } from "./adminUi";
import { useToast } from "./adminUtils";

// Figma: 07 Admin / 03 / admin-exercises-content (20:411). The exercises are the words of the lessons
// (one list for admin and child): editing a word saves the lesson it belongs to.
const emptyWord = (lessonId) => ({ lessonId, word: "", canonical: "", guide: "" });

function WordEditor({ entry, isNew, lessons, phones, onSave, onDelete }) {
  const [form, setForm] = useState(entry);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    if (!form.word.trim() || !form.canonical.trim()) return setError("Cần nhập từ tiếng Việt và chuỗi âm vị chuẩn.");
    if (!form.lessonId) return setError("Hãy chọn bài học chứa từ này.");
    setError(null);
    setBusy(true);
    const message = await onSave(form);
    setBusy(false);
    if (message) setError(message);
  };

  return (
    <Card className="p-5 flex flex-col gap-4" data-testid="exercise-editor">
      <p className="font-bold text-vp-ink">{isNew ? "Thêm từ vựng phát âm mới" : "Thiết lập chi tiết bài tập"}</p>
      <Field label="Bài học">
        <select data-testid="exercise-lesson" className={inputClass} value={form.lessonId || ""} onChange={set("lessonId")} disabled={!isNew}>
          <option value="">— Chọn bài học —</option>
          {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
      </Field>
      <Field label="Từ Tiếng Việt"><input data-testid="exercise-word" className={inputClass} value={form.word} onChange={set("word")} placeholder="VD: Bánh Chưng" /></Field>
      <Field label="Chuỗi âm vị chuẩn"><input data-testid="exercise-canonical" className={inputClass} value={form.canonical} onChange={set("canonical")} placeholder="VD: b a_X J _5a" /></Field>
      <Field label="Hướng dẫn cho bé"><input className={inputClass} value={form.guide || ""} onChange={set("guide")} placeholder="Nhấn mạnh phụ âm bật hơi 'CH'." /></Field>
      <p className="text-[11px] text-vp-muted">Âm vị hợp lệ: {phones.join(" ")}. Giọng đọc mẫu do trình duyệt tạo từ chính chữ của từ.</p>
      {error && <p data-testid="exercise-error" className="text-sm font-semibold text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button data-testid="exercise-approve" disabled={busy} onClick={save} className="flex-1 h-11 rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:opacity-60">Lưu từ vựng</button>
        {!isNew && <button data-testid="exercise-delete" disabled={busy} onClick={onDelete} className="h-11 rounded-xl bg-red-50 px-4 text-sm font-bold text-red-500">Xóa từ</button>}
      </div>
    </Card>
  );
}

export default function AdminContentView() {
  const { admin } = useStore();
  const toast = useToast();
  const [selected, setSelected] = useState(null); // {lessonId, wordId}
  const [draft, setDraft] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!admin.data) return <AdminLoading />;

  const lessons = admin.data.lessons;
  const entries = lessons.flatMap((l) => l.words.map((w) => ({ ...w, lessonId: l.id, lessonTitle: l.title, lessonStatus: l.status })));
  const current = selected && entries.find((e) => e.lessonId === selected.lessonId && e.id === selected.wordId);

  // Saves the lesson that owns the word, with the word added, changed or removed.
  const saveLesson = async (lessonId, words, successMessage) => {
    const lesson = lessons.find((l) => l.id === lessonId);
    const result = await admin.request(`/lessons/${lessonId}`, {
      method: "PUT",
      body: { title: lesson.title, category: lesson.category, status: lesson.status, words }
    });
    if (!result.ok) return result.error;
    toast.show(successMessage);
    return null;
  };

  const save = async (form) => {
    const lesson = lessons.find((l) => l.id === form.lessonId);
    const payload = { word: form.word.trim(), canonical: form.canonical.trim(), guide: form.guide || "" };
    const isNew = !form.id;
    const words = isNew
      ? [...lesson.words, payload]
      : lesson.words.map((w) => (w.id === form.id ? { ...w, ...payload } : w));
    const message = await saveLesson(lesson.id, words, `Đã lưu từ "${payload.word}"`);
    if (!message) setDraft(null);
    return message;
  };

  const remove = async () => {
    setConfirmDelete(false);
    const lesson = lessons.find((l) => l.id === current.lessonId);
    const message = await saveLesson(lesson.id, lesson.words.filter((w) => w.id !== current.id), `Đã xóa từ "${current.word}"`);
    if (message) toast.fail(message);
    else setSelected(null);
  };

  return (
    <div className="max-w-[1200px]">
      <AdminHeader actionLabel="Thêm từ vựng phát âm mới" onAction={() => { setSelected(null); setDraft(emptyWord(lessons[0]?.id)); }} />
      <div className="grid gap-6 [&>*]:min-w-0 lg:grid-cols-[1.6fr_1fr] items-start">
        <Card className="p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-vp-ink">Danh sách cơ sở dữ liệu phát âm</p>
            <span className="rounded-md bg-vp-canvas px-2 py-1 text-[11px] font-semibold text-vp-ink">Tổng cộng: {entries.length} từ vựng</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-vp-border">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-vp-canvas/70 text-left text-xs text-vp-muted">
                <tr><th className="px-4 py-3">Từ vựng (Việt)</th><th className="px-4 py-3">Chuỗi âm vị</th><th className="px-4 py-3">Bài học</th><th className="px-4 py-3">Nghe mẫu</th><th className="px-4 py-3">Trạng thái</th></tr>
              </thead>
              <tbody>
                {entries.map((ex) => (
                  <tr key={`${ex.lessonId}-${ex.id}`} data-testid={`exercise-row-${ex.id}`} onClick={() => { setDraft(null); setSelected({ lessonId: ex.lessonId, wordId: ex.id }); }}
                    className={`cursor-pointer border-t border-vp-border ${current && ex.id === current.id && ex.lessonId === current.lessonId && !draft ? "bg-vp-sky/40" : "hover:bg-vp-canvas/60"}`}>
                    <td className="px-4 py-3 font-bold text-orange-500">{ex.word}</td>
                    <td className="px-4 py-3 text-vp-ink font-mono text-xs">{ex.canonical}</td>
                    <td className="px-4 py-3 text-vp-ink">{ex.lessonTitle}</td>
                    <td className="px-4 py-3">
                      <button onClick={(e) => { e.stopPropagation(); speakVietnamese(ex.word); }} aria-label={`Nghe ${ex.word}`} className="text-vp-blue"><PlayCircle className="w-5 h-5" /></button>
                    </td>
                    <td className="px-4 py-3"><StatusBadge map={LESSON_STATUS} status={ex.lessonStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        {draft ? (
          <WordEditor key="new" entry={draft} isNew lessons={lessons} phones={admin.data.phones} onSave={save} />
        ) : current ? (
          <WordEditor key={`${current.lessonId}-${current.id}-${current.word}`} entry={current} lessons={lessons} phones={admin.data.phones} onSave={save} onDelete={() => setConfirmDelete(true)} />
        ) : null}
      </div>
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Xóa từ "${current?.word}"?`}
        footer={<><Button variant="ghost" onClick={() => setConfirmDelete(false)}>Giữ lại</Button><Button variant="danger" data-testid="exercise-confirm-delete" onClick={remove}>Xóa</Button></>}
      >
        <p className="text-sm text-vp-muted">Từ này sẽ biến mất khỏi bài học trong app của bé.</p>
      </Modal>
      <Toast message={toast.message} tone={toast.tone} onDone={toast.clear} />
    </div>
  );
}
