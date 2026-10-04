import React, { useState } from "react";
import { Card, Modal, Button, Field, inputClass } from "../../components/ui";
import { useStore } from "../../services/store";
import { nameError, isValidPhone, sanitizePhone, PHONE_ERROR, MAX_NAME_LENGTH } from "../../services/validators";
import { AdminHeader, AdminLoading, Toast } from "./adminUi";
import { useToast, runAdmin } from "./adminUtils";

// Figma: 07 Admin / 06 / admin-users-families (20:982)
const PLAN_LABEL = {
  free: { label: "Free", cls: "bg-slate-100 text-slate-600" },
  basic: { label: "Basic", cls: "bg-vp-sky text-vp-blue" },
  premium: { label: "Premium", cls: "bg-vp-sky text-vp-blue" },
  family: { label: "Family", cls: "bg-vp-sky text-vp-blue" }
};

// Shows a temporary password exactly once: the server never returns it again.
function TemporaryPassword({ title, name, password, onClose }) {
  return (
    <Modal open onClose={onClose} title={title} footer={<Button onClick={onClose}>Đã ghi lại</Button>}>
      <div className="flex flex-col gap-3 text-sm">
        <p className="text-vp-muted">Gửi mật khẩu tạm này riêng cho phụ huynh <b className="text-vp-ink">{name}</b>. Hệ thống sẽ yêu cầu họ đặt mật khẩu mới ngay lần đăng nhập đầu tiên.</p>
        <p data-testid="temp-password" className="rounded-xl bg-vp-canvas px-4 py-3 text-center font-mono text-xl font-bold tracking-wider text-vp-ink select-all">{password}</p>
        <p className="text-xs text-amber-700">Mật khẩu chỉ hiển thị một lần. Đóng cửa sổ này là không xem lại được; khi cần, hãy cấp lại mật khẩu tạm.</p>
      </div>
    </Modal>
  );
}

function AddParentModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", plan: "free" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, clean = (v) => v) => (e) => { setForm({ ...form, [k]: clean(e.target.value) }); setError(null); };
  const create = async () => {
    const problem = nameError(form.name, "họ tên");
    if (problem) return setError(problem);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError("Email chưa hợp lệ.");
    if (!isValidPhone(form.phone)) return setError(PHONE_ERROR);
    setBusy(true);
    const message = await onCreate({ ...form, name: form.name.trim(), email: form.email.trim() });
    setBusy(false);
    if (message) setError(message); // e.g. the email or phone is already registered
  };
  return (
    <Modal open onClose={onClose} title="Thêm tài khoản phụ huynh"
      footer={<><Button variant="ghost" onClick={onClose}>Hủy</Button><Button data-testid="parent-create" onClick={create} disabled={busy}>Tạo tài khoản</Button></>}
    >
      <div className="flex flex-col gap-3">
        <Field label="Họ và tên"><input data-testid="parent-name" className={inputClass} value={form.name} maxLength={MAX_NAME_LENGTH} onChange={set("name")} /></Field>
        <Field label="Email"><input data-testid="parent-email" className={inputClass} value={form.email} onChange={set("email")} /></Field>
        <Field label="Số điện thoại"><input data-testid="parent-phone" className={inputClass} inputMode="numeric" maxLength={10} value={form.phone} onChange={set("phone", sanitizePhone)} /></Field>
        <Field label="Gói đăng ký">
          <select className={inputClass} value={form.plan} onChange={set("plan")}>{Object.entries(PLAN_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        </Field>
        <p className="text-xs text-vp-muted">Hệ thống tạo một mật khẩu tạm riêng cho tài khoản này; phụ huynh phải đổi khi đăng nhập lần đầu.</p>
        {error && <p data-testid="parent-error" className="text-sm font-semibold text-red-500">{error}</p>}
      </div>
    </Modal>
  );
}

export default function AdminUsersView() {
  const { admin } = useStore();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [temp, setTemp] = useState(null); // {title, name, password}
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!admin.data) return <AdminLoading />;

  const parents = admin.data.accounts.filter((a) => a.role === "parent");
  const selected = parents.find((p) => p.id === selectedId) || parents[0];
  const kids = selected?.kids || [];
  const orphans = admin.data.unownedChildren || [];

  const setStatus = async (status) => {
    const done = await runAdmin(admin, toast, `/accounts/${selected.id}`, { method: "PATCH", body: { status } },
      `${status === "locked" ? "Đã khoá" : "Đã mở khoá"} tài khoản ${selected.name}`);
    return done;
  };

  const resetPassword = async () => {
    const data = await runAdmin(admin, toast, `/accounts/${selected.id}/reset-password`, { method: "POST" });
    if (data) setTemp({ title: "Mật khẩu tạm mới", name: selected.name, password: data.temporaryPassword });
  };

  const removeAccount = async () => {
    setConfirmDelete(false);
    const done = await runAdmin(admin, toast, `/accounts/${selected.id}`, { method: "DELETE" }, `Đã xóa tài khoản ${selected.name}`);
    if (done) setSelectedId(null);
  };

  const createParent = async (form) => {
    const result = await admin.request("/accounts", { method: "POST", body: form });
    if (!result.ok) return result.error;
    setAdding(false);
    setSelectedId(result.data.account.id);
    setTemp({ title: "Đã tạo tài khoản", name: result.data.account.name, password: result.data.temporaryPassword });
    return null;
  };

  return (
    <div className="max-w-[1200px]">
      <AdminHeader actionLabel="Thêm tài khoản phụ huynh" onAction={() => setAdding(true)} />
      <div className="flex flex-col gap-6">
        <Card className="p-4 sm:p-5 flex flex-col gap-4">
          <p className="font-bold text-vp-ink">Danh sách tài khoản phụ huynh ({parents.length})</p>
          <div className="overflow-x-auto rounded-xl border border-vp-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-vp-canvas/70 text-left text-xs text-vp-muted">
                <tr><th className="px-4 py-3">Phụ huynh (Email)</th><th className="px-4 py-3">Số điện thoại</th><th className="px-4 py-3">Gói đăng ký</th><th className="px-4 py-3">Hồ sơ trẻ liên kết</th><th className="px-4 py-3">Trạng thái</th></tr>
              </thead>
              <tbody>
                {parents.map((p) => {
                  const plan = PLAN_LABEL[p.plan] || PLAN_LABEL.free;
                  return (
                    <tr key={p.id} data-testid={`user-row-${p.id}`} onClick={() => setSelectedId(p.id)} className={`cursor-pointer border-t border-vp-border ${p.id === selected?.id ? "bg-vp-sky/40" : "hover:bg-vp-canvas/60"}`}>
                      <td className="px-4 py-3"><p className="font-bold text-vp-ink">{p.name}</p><p className="text-xs text-vp-muted">{p.email}</p></td>
                      <td className="px-4 py-3 text-vp-ink whitespace-nowrap">{p.phone}</td>
                      <td className="px-4 py-3"><span className={`rounded-lg px-2 py-1 text-xs font-bold ${plan.cls}`}>{plan.label}</span></td>
                      <td className="px-4 py-3 font-semibold text-vp-ink">{p.kids.map((k) => `${k.name} (${k.age}t)`).join(", ") || "—"}</td>
                      <td className="px-4 py-3"><span className={`rounded-lg px-2 py-1 text-xs font-bold ${p.status === "locked" ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"}`}>{p.status === "locked" ? "Khóa" : "Bình thường"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {selected && (
          <Card className="p-5 flex flex-col gap-4" data-testid="family-panel">
            <p className="font-bold text-vp-ink">Hồ sơ gia đình liên kết — {selected.name}</p>
            {kids.length === 0 && <p className="text-sm text-vp-muted">Chưa có hồ sơ trẻ nào.</p>}
            {kids.map((k, i) => (
              <div key={k.id} className="rounded-xl border border-vp-border bg-vp-canvas/50 p-4 flex flex-col gap-1.5">
                <p className="text-xs font-bold uppercase text-orange-500">Trẻ {i + 1}: {k.name} ({k.age} tuổi)</p>
                <div className="flex justify-between text-xs"><span className="text-vp-muted">Điểm phát âm trung bình:</span><span className="font-bold text-vp-ink">{k.score ? `${k.score}% (${k.score >= 90 ? "Hoàn hảo" : k.score >= 75 ? "Khá" : "Cần luyện"})` : "Chưa luyện"}</span></div>
                <div className="flex justify-between text-xs"><span className="text-vp-muted">Tiến độ:</span><span className="font-bold text-vp-ink">{k.completed_lessons}/{admin.data.lessons.filter((l) => l.status === "published").length} bài đã hoàn thành</span></div>
                <div className="flex justify-between text-xs"><span className="text-vp-muted">Điểm tích lũy:</span><span className="font-bold text-vp-ink">{k.stars} điểm</span></div>
              </div>
            ))}
            <div className="flex flex-col sm:flex-row gap-3">
              <button data-testid="reset-password" onClick={resetPassword} className="flex-1 h-11 rounded-full bg-vp-blue text-sm font-bold text-white">Cấp lại mật khẩu tạm</button>
              <button data-testid="toggle-lock" onClick={() => setStatus(selected.status === "locked" ? "active" : "locked")} className={`h-11 rounded-xl border px-5 text-sm font-bold ${selected.status === "locked" ? "border-emerald-500 text-emerald-600" : "border-red-400 text-red-500"}`}>
                {selected.status === "locked" ? "Mở khoá tài khoản" : "Khoá tài khoản"}
              </button>
              <button data-testid="delete-account" onClick={() => setConfirmDelete(true)} className="h-11 rounded-xl border border-red-400 px-5 text-sm font-bold text-red-500">Xóa tài khoản</button>
            </div>
          </Card>
        )}

        {orphans.length > 0 && (
          <Card className="p-5 flex flex-col gap-3" data-testid="orphan-panel">
            <p className="font-bold text-vp-ink">Hồ sơ bé không thuộc tài khoản nào ({orphans.length})</p>
            <p className="text-xs text-vp-muted">Các hồ sơ cũ được tạo trước khi có tài khoản phụ huynh. Chúng không hiện với bất kỳ phụ huynh nào; có thể xóa hẳn.</p>
            {orphans.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-vp-border px-4 py-2 text-sm">
                <span className="font-semibold text-vp-ink">{c.name} ({c.age} tuổi)</span>
                <button onClick={() => runAdmin(admin, toast, `/children/${c.id}`, { method: "DELETE" }, `Đã xóa hồ sơ ${c.name}`)} className="text-xs font-bold text-red-500">Xóa</button>
              </div>
            ))}
          </Card>
        )}
      </div>

      {adding && <AddParentModal onClose={() => setAdding(false)} onCreate={createParent} />}
      {temp && <TemporaryPassword {...temp} onClose={() => setTemp(null)} />}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Xóa tài khoản ${selected?.name}?`}
        footer={<><Button variant="ghost" onClick={() => setConfirmDelete(false)}>Giữ lại</Button><Button variant="danger" data-testid="confirm-delete-account" onClick={removeAccount}>Xóa vĩnh viễn</Button></>}
      >
        <p className="text-sm text-vp-muted">Tài khoản cùng toàn bộ hồ sơ bé, điểm và lịch sử luyện tập sẽ bị xóa khỏi hệ thống. Không thể hoàn tác.</p>
      </Modal>
      <Toast message={toast.message} tone={toast.tone} onDone={toast.clear} />
    </div>
  );
}
