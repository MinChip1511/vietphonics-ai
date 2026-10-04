import React, { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { Card, PageHeader, Modal, Button } from "../../components/ui";
import { useStore } from "../../services/store";
import { nameError, MAX_NAME_LENGTH } from "../../services/validators";
import { api } from "../../services/apiClient";
import ChildSwitcher from "./ChildSwitcher";

// Figma: 04 Parent UX / 05 / Screen-ChildProfile (7:1285)
const AGE_OPTIONS = [
  { value: 4, label: "4 tuổi (Lớp Mầm)" },
  { value: 5, label: "5 tuổi (Lớp Chồi)" },
  { value: 6, label: "6 tuổi (Lớp Lá)" },
  { value: 7, label: "7 tuổi (Lớp 1)" }
];
const REGIONS = [
  { id: "north", label: "Học theo Giọng Bắc (Hà Nội)" },
  { id: "south", label: "Học theo Giọng Nam (Sài Gòn)" },
  { id: "mixed", label: "Đa vùng miền" }
];

function ProfileForm({ child }) {
  const { getChildSettings, updateChild } = useStore();
  const [error, setError] = useState(null);
  const [name, setName] = useState(child.name);
  const [age, setAge] = useState(child.age);
  const [region, setRegion] = useState(getChildSettings(child.id).region);
  const [saved, setSaved] = useState(false);
  const problem = nameError(name, "tên của bé");
  const dirty = name !== child.name || Number(age) !== child.age || region !== getChildSettings(child.id).region;

  const save = async () => {
    if (problem) return;
    setError(null);
    const res = await updateChild(child.id, { name: name.trim(), age: Number(age), settings: { region } });
    if (!res.ok) return setError(res.error);
    setSaved(true);
  };
  const cancel = () => {
    setName(child.name);
    setAge(child.age);
    setRegion(getChildSettings(child.id).region);
  };
  const field = "h-12 w-full rounded-full border border-vp-border bg-white px-4 text-sm text-vp-ink outline-none focus:border-vp-blue";

  return (
    <Card className="p-6 sm:p-8 rounded-3xl flex flex-col gap-6">
      <p className="text-xl font-bold text-vp-ink">Thông tin cơ bản của bé</p>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold text-vp-ink">Tên thường gọi của con</span>
        <input data-testid="child-name" className={field} value={name} maxLength={MAX_NAME_LENGTH} onChange={(e) => { setName(e.target.value); setSaved(false); }} />
        {problem && <span className="text-xs text-red-500">{problem}</span>}
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold text-vp-ink">Độ tuổi hiện tại</span>
        <select className={field} value={age} onChange={(e) => { setAge(e.target.value); setSaved(false); }}>
          {AGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold text-vp-ink">Vùng miền phát âm mục tiêu mong muốn</span>
        <div className="flex flex-col sm:flex-row gap-1 rounded-3xl sm:rounded-full border border-vp-border bg-[#faf9f5] p-1">
          {REGIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => { setRegion(r.id); setSaved(false); }}
              className={`flex-1 rounded-full px-3 py-2 text-xs ${region === r.id ? "bg-vp-sky font-bold text-vp-blue" : "font-medium text-vp-muted"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-4">
        <button data-testid="save-child" onClick={save} disabled={!dirty || Boolean(problem)} className="rounded-[32px] bg-vp-blue px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
          Lưu thay đổi hồ sơ
        </button>
        <button onClick={cancel} disabled={!dirty} className="rounded-[32px] border border-vp-border px-6 py-3 text-sm text-vp-muted disabled:opacity-50">Hủy bỏ</button>
        {saved && !dirty && <span className="text-sm font-semibold text-emerald-600">Đã lưu hồ sơ!</span>}
        {error && <span className="text-sm font-semibold text-red-500">{error}</span>}
      </div>
    </Card>
  );
}

export default function ChildProfileView({ profiles, selectedChild, onSelectChild, onDeleteChild }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState(null);
  if (!selectedChild) return null;

  // The CSV comes from the server (the child's own history) and is saved as a file.
  const exportCsv = async () => {
    setActionError(null);
    try {
      const res = await api(`/profiles/${encodeURIComponent(selectedChild.id)}/export.csv`, { raw: true });
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `vietphonics-${selectedChild.name}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const remove = async () => {
    setConfirmDelete(false);
    const res = await onDeleteChild(selectedChild.id);
    if (res && !res.ok) setActionError(res.error);
  };

  return (
    <div className="flex flex-col gap-7 max-w-[1080px]">
      <PageHeader
        subtitle="Cập nhật thông tin để AI chấm điểm và gợi ý bài học phù hợp với con."
        actions={<ChildSwitcher profiles={profiles} selectedChild={selectedChild} onSelectChild={onSelectChild} />}
      />
      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr] items-start">
        <ProfileForm key={selectedChild.id} child={selectedChild} />
        <Card className="p-6 sm:p-8 rounded-3xl flex flex-col gap-6">
          <p className="text-xl font-bold text-vp-ink">Quyền lợi dữ liệu của bé</p>
          {actionError && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-500">{actionError}</p>}
          <p className="text-[13px] leading-relaxed text-vp-muted">Để bảo vệ quyền trẻ em trên không gian mạng, ba mẹ có toàn quyền xóa hoặc xuất toàn bộ dữ liệu ghi âm của con bất cứ lúc nào.</p>
          <button onClick={exportCsv} className="flex items-center justify-between gap-3 rounded-xl bg-[#faf9f5] p-4 text-left">
            <span>
              <span className="block text-sm font-bold text-vp-ink">Xuất dữ liệu học vần</span>
              <span className="block text-[11px] text-vp-muted">Định dạng tệp Excel/CSV.</span>
            </span>
            <span className="rounded-xl border border-vp-border bg-white p-2"><Download className="w-4 h-4 text-vp-ink" /></span>
          </button>
          <button
            data-testid="delete-child"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-left text-red-500 disabled:opacity-50"
          >
            <span>
              <span className="block text-sm font-bold">Xóa hồ sơ & Bản ghi</span>
              <span className="block text-[11px] opacity-80">Hành động này không thể hoàn tác.</span>
            </span>
            <span className="rounded-xl bg-red-500 p-2"><Trash2 className="w-4 h-4 text-white" /></span>
          </button>
        </Card>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Xóa hồ sơ ${selectedChild.name}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Giữ lại</Button>
            <Button variant="danger" data-testid="confirm-delete" onClick={remove}>Xóa vĩnh viễn</Button>
          </>
        }
      >
        <p className="text-sm text-vp-muted">Toàn bộ tiến độ, điểm thưởng và lịch sử luyện tập của bé sẽ bị xóa khỏi hệ thống. Hành động này không thể hoàn tác.</p>
      </Modal>

    </div>
  );
}
