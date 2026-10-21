import React, { useState } from "react";
import { Card } from "../../components/ui";
import { useStore } from "../../services/store";
import { timeAgo } from "../parent/parentUtils";
import { AdminHeader, AdminLoading, Toast, PANEL_TITLE } from "./adminUi";
import { useToast, runAdmin } from "./adminUtils";

// Figma: 07 Admin / 12 / admin-system-settings (20:1857)
const RETENTION_OPTIONS = [30, 60, 90, 180, 365];

export default function AdminSettingsView() {
  const { admin } = useStore();
  const toast = useToast();
  const [mailTo, setMailTo] = useState("");
  const [mailResult, setMailResult] = useState(null); // {ok, text}
  if (!admin.data) return <AdminLoading />;

  const sendTestMail = async () => {
    setMailResult(null);
    const result = await admin.request("/email/test", { method: "POST", body: { to: mailTo.trim() } });
    setMailResult(result.ok ? { ok: true, text: `Đã gửi thư thử tới ${mailTo.trim()} (${result.data.provider}). Kiểm tra hộp thư và cả mục thư rác.` } : { ok: false, text: result.error });
  };
  const { settings, audit } = admin.data;

  return (
    <div className="max-w-[1200px]">
      <AdminHeader />
      <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-[1fr_420px] items-start">
        <div className="flex flex-col gap-5">
          <Card flat className="p-6 flex flex-col gap-5">
            <p className={PANEL_TITLE}>Phân quyền vai trò hệ thống</p>
            {settings.roles.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#F8FAFC] px-4 py-3">
                <div><p className="text-xs font-bold text-[#0F172A]">{r.name}</p><p className="text-[11px] text-[#6B7280]">{r.desc}</p></div>
                <span className="text-xs text-[#6B7280] whitespace-nowrap">{r.count} tài khoản</span>
              </div>
            ))}
            <div className="border-t border-[#E2E8F0] pt-5 flex flex-col gap-3">
              <p className={PANEL_TITLE}>Chính sách bảo mật & Lưu trữ âm học</p>
              <div className="rounded-lg bg-[#F8FAFC] p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] text-[#0F172A]">Lưu trữ dữ liệu tệp Audio phát âm tối đa</p>
                  <select
                    data-testid="retention-select"
                    aria-label="Số ngày lưu trữ audio"
                    value={settings.audioRetentionDays}
                    onChange={(e) => {
                      const days = Number(e.target.value);
                      runAdmin(admin, toast, "/settings", { method: "PUT", body: { audioRetentionDays: days } }, `Đã lưu: ${days} ngày`);
                    }}
                    className="appearance-none cursor-pointer rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-bold text-[#0F172A]"
                  >
                    {RETENTION_OPTIONS.map((d) => <option key={d} value={d}>{d} Ngày</option>)}
                  </select>
                </div>
                <p className="text-xs text-[#6B7280]">Hiện hệ thống chưa lưu file ghi âm của bé. Thiết lập này sẽ có hiệu lực khi tính năng lưu trữ được bật.</p>
              </div>
            </div>
          </Card>
        </div>
        <div className="flex flex-col gap-5">
          <Card flat className="p-6 flex flex-col gap-3">
            <p className={PANEL_TITLE}>Nhật ký hệ thống (Audit Logs)</p>
            <div className="flex flex-col divide-y divide-[#E2E8F0] max-h-[420px] overflow-y-auto" data-testid="audit-log">
              {audit.length === 0 && <p className="py-3 text-sm text-vp-muted">Chưa có thao tác quản trị nào.</p>}
              {audit.map((a) => (
                <div key={a.id} className="py-3">
                  <p className="text-[13px] text-[#0F172A]">{a.action}</p>
                  <div className="flex justify-between text-[11px] text-[#94A3B8]"><span>{a.actor}</span><span>{timeAgo(a.created_at)}</span></div>
                </div>
              ))}
            </div>
            <div className="border-t border-[#E2E8F0] pt-3">
              <p className="text-[13px] font-semibold text-[#0F172A]">Hình thức thanh toán</p>
              <p className="text-xs text-[#6B7280]">Chuyển khoản QR VNPay/MoMo, <b className="text-emerald-600">xác nhận thủ công</b> ở mục Đơn hàng</p>
            </div>
          </Card>
          <Card flat className="p-6 flex flex-col gap-3" data-testid="email-test">
            <p className={PANEL_TITLE}>Kiểm tra gửi email</p>
            <p className="text-xs text-[#6B7280]">Gửi một thư thử để biết việc gửi mã xác thực qua email có hoạt động không. Nếu lỗi, thông báo bên dưới là lỗi thật từ nhà cung cấp.</p>
            <div className="flex gap-2">
              <input data-testid="email-test-to" type="email" value={mailTo} onChange={(e) => setMailTo(e.target.value)} placeholder="email nhận thư thử" className="h-10 flex-1 min-w-0 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm" />
              <button data-testid="email-test-send" onClick={sendTestMail} disabled={!mailTo.trim()} className="h-10 rounded-lg bg-vp-blue px-4 text-sm font-semibold text-white disabled:opacity-50">Gửi thử</button>
            </div>
            {mailResult && <p data-testid="email-test-result" className={`rounded-lg px-3 py-2 text-xs font-semibold ${mailResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{mailResult.text}</p>}
          </Card>
        </div>
      </div>
      <Toast message={toast.message} tone={toast.tone} onDone={toast.clear} />
    </div>
  );
}
