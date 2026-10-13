import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, Field, Modal, Button, inputClass } from "../../components/ui";
import { useStore } from "../../services/store";
import { LESSON_STATUS } from "../../data/adminLabels";
import { AdminHeader, AdminLoading, StatusBadge, Toast, TABLE_WRAP, TABLE, THEAD, TH, TR, TD, CHIP_SELECT, PANEL_TITLE } from "./adminUi";
import { useToast, runAdmin } from "./adminUtils";
import { timeAgo } from "../parent/parentUtils";

// Figma: 07 Admin / 02 / admin-lessons (20:218). These are the real lessons children practise with:
// "Đã xuất bản" lessons appear in the child's app, drafts and archived ones do not.
const DIFFICULTIES = ["Dễ", "Trung bình", "Thử thách"];
const emptyWord = () => ({ word: "", canonical: "", guide: "" });

function LessonEditor({ lesson, isNew, categories, phones, onSave, onDelete, onCancel }) {
  const [form, setForm] = useState(() => ({ ...lesson, words: (lesson.words || []).map((w) => ({ ...w })) }));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setWord = (i, k) => (e) => setForm({ ...form, words: form.words.map((w, j) => (j === i ? { ...w, [k]: e.target.value } : w)) });

  const save = async (status) => {
    if (!form.title.trim()) return setError("Vui lòng nhập tiêu đề bài học.");
    if (!form.category) return setError("Vui lòng chọn nhóm bài học.");
    setError(null);
    setBusy(true);
    const message = await onSave({ ...form, status: status || form.status });
    setBusy(false);
    if (message) setError(message);
  };

  return (
    <Card flat className="p-6 flex flex-col gap-4" data-testid="lesson-editor">
      <div className="flex items-center justify-between">
        <p className={PANEL_TITLE}>{isNew ? "Tạo bài học mới" : `Chi tiết bài học (${lesson.id})`}</p>
        <span className="rounded-md bg-vp-sky px-2 py-0.5 text-[11px] font-bold text-vp-blue">Chế độ chỉnh sửa</span>
      </div>
      <Field label="Tiêu đề bài học (tiếng Việt)">
        <input data-testid="lesson-title" className={inputClass} value={form.title} onChange={set("title")} />
      </Field>
      <Field label="Nhóm bài học">
        <select data-testid="lesson-category" className={inputClass} value={form.category || ""} onChange={set("category")}>
          <option value="">— Chọn nhóm —</option>
          {categories.filter((c) => c.id !== "all").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Độ khó">
        <select className={inputClass} value={form.difficulty || "Dễ"} onChange={set("difficulty")}>{DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}</select>
      </Field>
      <Field label="Mô tả ngắn cho bé">
        <input className={inputClass} value={form.description || ""} onChange={set("description")} />
      </Field>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-vp-ink">Từ luyện tập ({form.words.length})</p>
          <button type="button" data-testid="word-add" onClick={() => setForm({ ...form, words: [...form.words, emptyWord()] })} className="flex items-center gap-1 text-xs font-bold text-vp-blue"><Plus className="w-3.5 h-3.5" /> Thêm từ</button>
        </div>
        {form.words.map((w, i) => (
          <div key={w.id || i} className="grid gap-2 rounded-xl border border-vp-border p-3 sm:grid-cols-[1fr_1fr_auto]">
            <input data-testid={`word-${i}-text`} aria-label="Từ" className={inputClass} placeholder="Từ (VD: Ngôi sao)" value={w.word} onChange={setWord(i, "word")} />
            <input data-testid={`word-${i}-canonical`} aria-label="Chuỗi âm vị" className={inputClass} placeholder="Âm vị (VD: N O i _1 S a w _1)" value={w.canonical} onChange={setWord(i, "canonical")} />
            <button type="button" aria-label="Xóa từ" onClick={() => setForm({ ...form, words: form.words.filter((_, j) => j !== i) })} className="grid place-items-center text-red-500"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        <p className="text-[11px] text-vp-muted">Âm vị hợp lệ: {phones.join(" ")}. Mỗi âm tiết kết thúc bằng một dấu thanh (_1 … _6b).</p>
      </div>

      {error && <p data-testid="lesson-error" className="text-sm font-semibold text-red-500">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button data-testid="lesson-publish" disabled={busy} onClick={() => save("published")} className="flex-1 rounded-lg bg-vp-blue px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{form.status === "published" ? "Cập nhật" : "Xuất bản"}</button>
        <button disabled={busy} onClick={() => save("draft")} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-sm font-semibold text-[#475569]">Lưu nháp</button>
        <button onClick={onCancel} className="rounded-lg border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#475569]">Huỷ</button>
      </div>
      {!isNew && (
        <div className="flex gap-4">
          {form.status !== "archived" && <button onClick={() => save("archived")} className="text-xs font-semibold text-amber-600">Chuyển vào lưu trữ (ẩn với bé)</button>}
          <button data-testid="lesson-delete" onClick={onDelete} className="text-xs font-semibold text-red-500">Xóa bài học</button>
        </div>
      )}
    </Card>
  );
}

const shortId = (id) => (String(id).length > 14 ? `${String(id).slice(0, 12)}…` : id);

export default function AdminLessonsView() {
  const { admin, catalog } = useStore();
  const toast = useToast();
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!admin.data) return <AdminLoading />;

  const lessons = admin.data.lessons;
  const categories = catalog.categories;
  const categoryName = (id) => categories.find((c) => c.id === id)?.name.replace(/^Level \d+: /, "") || id;
  const rows = lessons.filter((l) =>
    (category === "all" || l.category === category) && (status === "all" || l.status === status) && l.title.toLowerCase().includes(query.toLowerCase())
  );
  const selected = lessons.find((l) => l.id === selectedId);

  const newLesson = () => setDraft({ title: "", category: "", difficulty: "Dễ", description: "", status: "draft", words: [emptyWord()] });

  const save = async (lesson) => {
    const isNew = !lesson.id;
    const result = await admin.request(isNew ? "/lessons" : `/lessons/${lesson.id}`, {
      method: isNew ? "POST" : "PUT",
      body: { title: lesson.title, category: lesson.category, difficulty: lesson.difficulty, description: lesson.description, status: lesson.status, words: lesson.words }
    });
    if (!result.ok) return result.error;
    setDraft(null);
    setSelectedId(result.data.id);
    toast.show(`Đã lưu "${result.data.title}" - ${LESSON_STATUS[result.data.status].label}`);
    return null;
  };

  const remove = async () => {
    setConfirmDelete(false);
    const done = await runAdmin(admin, toast, `/lessons/${selected.id}`, { method: "DELETE" }, `Đã xóa bài học "${selected.title}"`);
    if (done) setSelectedId(null);
  };

  return (
    <div className="max-w-[1200px]">
      <AdminHeader actionLabel="Tạo bài học mới" onAction={newLesson} />
      <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-[1fr_420px] items-start">
        <Card flat className="p-6 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <select aria-label="Lọc nhóm" className={CHIP_SELECT} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">Tất cả nhóm</option>{categories.filter((c) => c.id !== "all").map((c) => <option key={c.id} value={c.id}>{categoryName(c.id)}</option>)}
            </select>
            <select aria-label="Lọc trạng thái" className={CHIP_SELECT} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">Mọi trạng thái</option>{Object.entries(LESSON_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <input data-testid="lesson-search" aria-label="Tìm kiếm bài học" className={`${CHIP_SELECT} ml-auto w-full sm:w-52`} placeholder="Tìm kiếm bài học..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className={TABLE_WRAP}>
            <table className={TABLE}>
              <thead className={THEAD}>
                <tr><th className={TH}>ID</th><th className={TH}>Tên bài học</th><th className={TH}>Nhóm</th><th className={TH}>Độ khó</th><th className={TH}>Số từ</th><th className={TH}>Trạng thái</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-vp-muted">Không tìm thấy bài học phù hợp.</td></tr>}
                {rows.map((l) => (
                  <tr key={l.id} data-testid={`lesson-row-${l.id}`} onClick={() => { setDraft(null); setSelectedId(l.id); }} className={`cursor-pointer ${TR} ${l.id === selectedId && !draft ? "bg-vp-sky/40" : "hover:bg-vp-canvas/60"}`}>
                    <td className={`${TD} font-semibold text-[#1978DC] whitespace-nowrap`} title={l.id}>{shortId(l.id)}</td>
                    <td className={TD}><p className="font-semibold text-[#0F172A]">{l.title}</p>{l.updated_at && <p className="text-[11px] text-[#94A3B8] whitespace-nowrap">Cập nhật mới nhất: {timeAgo(l.updated_at)}</p>}</td>
                    <td className={`${TD} text-[#475569]`}>{categoryName(l.category)}</td>
                    <td className={`${TD} text-[#475569] whitespace-nowrap`}>{l.difficulty}</td>
                    <td className={`${TD} text-[#475569] whitespace-nowrap`}>{l.words.length} từ</td>
                    <td className={TD}><StatusBadge map={LESSON_STATUS} status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        {draft ? (
          <LessonEditor key="new" lesson={draft} isNew categories={categories} phones={admin.data.phones} onSave={save} onCancel={() => setDraft(null)} />
        ) : selected ? (
          <LessonEditor key={selected.id + selected.updated_at} lesson={selected} categories={categories} phones={admin.data.phones} onSave={save} onDelete={() => setConfirmDelete(true)} onCancel={() => setSelectedId(null)} />
        ) : (
          <Card flat className="p-6 text-sm text-vp-muted">Chọn một bài học để chỉnh sửa.</Card>
        )}
      </div>
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Xóa bài học "${selected?.title}"?`}
        footer={<><Button variant="ghost" onClick={() => setConfirmDelete(false)}>Giữ lại</Button><Button variant="danger" data-testid="lesson-confirm-delete" onClick={remove}>Xóa vĩnh viễn</Button></>}
      >
        <p className="text-sm text-vp-muted">Bài học sẽ biến mất khỏi app của bé và tiến độ học bài này không còn được tính. Nếu chỉ muốn ẩn tạm thời, hãy chuyển vào lưu trữ.</p>
      </Modal>
      <Toast message={toast.message} tone={toast.tone} onDone={toast.clear} />
    </div>
  );
}
