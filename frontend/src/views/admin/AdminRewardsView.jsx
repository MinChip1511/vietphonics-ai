import React, { useState } from "react";
import { ImagePlus, Percent, Gift } from "lucide-react";
import { Card, Modal, Button, Field, inputClass } from "../../components/ui";
import { useStore } from "../../services/store";
import { assetUrl } from "../../services/apiClient";
import { REWARD_KINDS } from "../../data/adminLabels";
import { AdminHeader, AdminLoading, Toast } from "./adminUi";
import { useToast, runAdmin } from "./adminUtils";

// Figma: 07 Admin / 11 / admin-rewards (20:1731). These are the rewards in the child's "Đổi quà" screen.
const MAX_IMAGE_BYTES = 1_500_000;

function RewardModal({ reward, onClose, onSave }) {
  const [form, setForm] = useState(reward);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(assetUrl(reward.image));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const pickImage = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(picked.type)) return setError("Chỉ nhận ảnh JPG, PNG hoặc WebP.");
    if (picked.size > MAX_IMAGE_BYTES) return setError("Ảnh tối đa 1.5MB.");
    setError(null);
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const save = async () => {
    if (!form.title.trim()) return setError("Vui lòng nhập tên phần thưởng.");
    if (!(Number(form.cost) > 0)) return setError("Giá đổi phải lớn hơn 0.");
    setBusy(true);
    const message = await onSave({ ...form, title: form.title.trim(), cost: Number(form.cost) }, file);
    setBusy(false);
    if (message) setError(message);
  };

  return (
    <Modal open onClose={onClose} title={reward.id ? "Sửa cấu hình phần thưởng" : "Tạo phần thưởng mới"}
      footer={<><Button variant="ghost" onClick={onClose}>Hủy</Button><Button data-testid="reward-save" onClick={save} disabled={busy}>Lưu</Button></>}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-20 h-20 rounded-xl bg-vp-canvas overflow-hidden grid place-items-center">
            {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : <Gift className="w-8 h-8 text-vp-muted" />}
          </div>
          <label className="cursor-pointer rounded-full border border-vp-border px-4 py-2 text-sm font-semibold text-vp-ink">
            Tải ảnh lên <input data-testid="reward-image" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickImage} />
          </label>
        </div>
        <Field label="Tên phần thưởng"><input data-testid="reward-title" className={inputClass} value={form.title} onChange={set("title")} /></Field>
        <Field label="Loại"><select className={inputClass} value={form.kind} onChange={set("kind")}>{REWARD_KINDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
        <Field label="Giá đổi (điểm)"><input data-testid="reward-cost" className={inputClass} type="number" min={1} value={form.cost} onChange={set("cost")} /></Field>
        {error && <p data-testid="reward-error" className="text-sm font-semibold text-red-500">{error}</p>}
      </div>
    </Modal>
  );
}

export default function AdminRewardsView() {
  const { admin } = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  if (!admin.data) return <AdminLoading />;
  const rewards = admin.data.rewards;

  const save = async (r, file) => {
    const body = { title: r.title, kind: r.kind, cost: r.cost, active: r.active ?? true };
    const result = await admin.request(r.id ? `/rewards/${r.id}` : "/rewards", { method: r.id ? "PUT" : "POST", body });
    if (!result.ok) return result.error;
    if (file) {
      const form = new FormData();
      form.append("image", file);
      const uploaded = await admin.request(`/rewards/${result.data.id}/image`, { method: "POST", form });
      if (!uploaded.ok) return `Đã lưu phần thưởng nhưng chưa tải được ảnh: ${uploaded.error}`;
    }
    toast.show(`Đã lưu ${r.title}`);
    setEditing(null);
    return null;
  };

  const toggle = (r) =>
    runAdmin(admin, toast, `/rewards/${r.id}`, { method: "PUT", body: { active: !r.active } }, `${r.active ? "Đã tạm ngưng" : "Đã kích hoạt"} ${r.title}`);

  const remove = async (r) => {
    const data = await runAdmin(admin, toast, `/rewards/${r.id}`, { method: "DELETE" });
    if (data) toast.show(data.status === "archived" ? `"${r.title}" đã có bé sở hữu nên được lưu trữ (ẩn với bé khác)` : `Đã xóa ${r.title}`);
  };

  return (
    <div className="max-w-[1200px]">
      <AdminHeader />
      <Card className="p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="w-12 h-12 shrink-0 rounded-lg border border-vp-border bg-slate-50 grid place-items-center"><ImagePlus className="w-5 h-5 text-vp-muted" /></span>
          <div>
            <p className="text-sm font-bold text-vp-ink">Thêm phần thưởng trực quan mới</p>
            <p className="text-xs text-vp-muted">Tải lên hình ảnh sticker, trang phục hoặc huy hiệu để các bé đổi bằng điểm tích lũy khi học.</p>
          </div>
        </div>
        <button data-testid="reward-create" onClick={() => setEditing({ title: "", kind: REWARD_KINDS[0], cost: 200, image: null })} className="self-start sm:self-auto rounded-full bg-vp-blue px-4 py-2 text-xs font-semibold text-white">Tạo phần thưởng</button>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-5">
        {rewards.map((r) => (
          <div key={r.id} data-testid={`reward-card-${r.id}`} className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col">
            <div className="h-40 bg-vp-canvas grid place-items-center">
              {r.image ? <img src={assetUrl(r.image)} alt={r.title} className="w-full h-full object-cover" /> : <Gift className="w-10 h-10 text-vp-muted" />}
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div><p className="text-sm font-bold text-slate-900">{r.title}</p><p className="text-xs text-slate-600">{r.kind}</p></div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-orange-500">{r.cost} điểm</p>
                <button onClick={() => toggle(r)}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold ${r.active ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"}`} title="Bấm để đổi trạng thái"
                >
                  {r.active ? "Hoạt động" : "Tạm ngưng"}
                </button>
              </div>
              <div className="border-t border-slate-100 pt-2 flex gap-2">
                <button onClick={() => setEditing(r)} className="flex-1 rounded-md border border-slate-200 p-1.5 text-xs text-slate-600 hover:bg-vp-canvas">Sửa cấu hình</button>
                <button data-testid={`reward-delete-${r.id}`} onClick={() => remove(r)} className="rounded-md border border-red-200 px-3 text-xs text-red-500 hover:bg-red-50">Xóa</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Card className="p-4 flex items-start gap-3">
        <Percent className="w-6 h-6 text-orange-500 shrink-0" />
        <div>
          <p className="text-sm font-bold text-slate-900">Các chương trình khuyến mãi & Nhiệm vụ đổi điểm đặc biệt (Promotions Campaign)</p>
          <p className="text-xs text-slate-600">Tính năng đặt nhiệm vụ hằng ngày của trường học và sự kiện nhân đôi điểm sẽ được hỗ trợ tiếp theo.</p>
        </div>
      </Card>
      {editing && <RewardModal reward={editing} onClose={() => setEditing(null)} onSave={save} />}
      <Toast message={toast.message} tone={toast.tone} onDone={toast.clear} />
    </div>
  );
}
