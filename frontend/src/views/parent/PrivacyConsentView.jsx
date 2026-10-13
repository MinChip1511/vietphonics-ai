import React from "react";
import { ChevronDown } from "lucide-react";
import { Card, PageHeader, Toggle } from "../../components/ui";
import { useStore } from "../../services/store";
import ChildSwitcher from "./ChildSwitcher";

// Figma: 04 Parent UX / 06 / Screen-PrivacyConsent (7:1378)
const RETENTION = [
  { value: "1", label: "Tự động xóa sau 24 giờ" },
  { value: "30", label: "Tự động xóa sau 30 ngày" },
  { value: "90", label: "Tự động xóa sau 90 ngày" },
  { value: "course", label: "Xóa khi hoàn thành khóa học" }
];

export default function PrivacyConsentView({ profiles, selectedChild, onSelectChild }) {
  const { getChildSettings, setChildSettings } = useStore();
  if (!selectedChild) return null;
  const s = getChildSettings(selectedChild.id);
  const set = (patch) => setChildSettings(selectedChild.id, patch);

  return (
    <div className="flex flex-col gap-7 max-w-[1080px]">
      <div className="-mb-3"><PageHeader bare actions={<ChildSwitcher profiles={profiles} selectedChild={selectedChild} onSelectChild={onSelectChild} />} /></div>
      <Card className="p-6 sm:p-8 rounded-3xl flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xl font-bold text-vp-ink">Quản lý quyền thu âm & Đào tạo AI</p>
            <p className="text-[13px] text-vp-muted">Để cải tiến thuật toán, hệ thống cần thỏa thuận rõ ràng và minh bạch với phụ huynh.</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-vp-border p-5">
          <div className="flex flex-col gap-1.5">
            <p className="font-bold text-vp-ink">1. Cho phép phân tích giọng của con trực tiếp bằng AI tại tệp lưu trữ nội bộ</p>
            <p className="text-[13px] leading-relaxed text-vp-muted">
              Bắt buộc để vận hành tính năng học vần cơ bản (chấm điểm Đạt/Chưa Đạt). Bản ghi giọng của {selectedChild.name} chỉ dùng để chấm điểm và không được lưu trên máy chủ.
              {!s.consentAnalysis && <span className="block font-semibold text-red-500 mt-1">Đang tắt: bé sẽ không nhận được điểm chấm AI khi luyện tập.</span>}
            </p>
          </div>
          <Toggle label="Cho phép phân tích AI" checked={s.consentAnalysis} onChange={(v) => set({ consentAnalysis: v })} />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-vp-border p-5">
          <div className="flex flex-col gap-1.5">
            <p className="flex flex-wrap items-center gap-2 font-bold text-vp-ink">
              2. Cho phép sử dụng tệp thu âm ẩn danh để đào tạo mô hình ngôn ngữ tiếng Việt
              <span className="rounded-md bg-[#FFE4E6] px-2 py-0.5 text-[9px] font-bold text-[#9F1239]">MẶC ĐỊNH TẮT</span>
            </p>
            <p className="text-[13px] leading-relaxed text-vp-muted">Chúng tôi tuyệt đối tôn trọng sự riêng tư của bé. Tùy chọn này tắt mặc định để đảm bảo không tệp âm thanh nào được dùng nâng cấp mô hình AI nếu không được bạn chủ động tích chọn.</p>
          </div>
          <Toggle label="Cho phép đào tạo AI" checked={s.consentTraining} onChange={(v) => set({ consentTraining: v })} />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-vp-border p-5">
          <div className="flex flex-col gap-1.5">
            <p className="font-bold text-vp-ink">3. Thời hạn lưu trữ tệp ghi âm giọng nói của con</p>
            <p className="text-[13px] leading-relaxed text-vp-muted">Hiện hệ thống chưa lưu bản ghi âm trên máy chủ; lựa chọn này sẽ có hiệu lực khi tính năng lưu trữ được bật.</p>
          </div>
          <span className="relative shrink-0">
          <select
            aria-label="Thời hạn lưu trữ"
            value={s.retention}
            onChange={(e) => set({ retention: e.target.value })}
            className="appearance-none rounded-xl border border-vp-border bg-[#faf9f5] py-2.5 pl-4 pr-10 text-[13px] font-bold text-vp-ink"
          >
            {RETENTION.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vp-muted" />
          </span>
        </div>
        <p className="text-xs text-vp-muted">Thay đổi được lưu tự động cho hồ sơ {selectedChild.name}.</p>
      </Card>
    </div>
  );
}
