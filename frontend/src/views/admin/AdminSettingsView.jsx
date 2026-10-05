import React, { useState } from "react";
import { Card } from "../../components/ui";
import { useStore } from "../../services/store";
import { timeAgo } from "../parent/parentUtils";
import { AdminHeader, AdminLoading, Toast } from "./adminUi";
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
      <div className="grid gap-6 [&>*]:min-w-0 lg:grid-cols-[1.5fr_1fr] items-start">
        <Card className="p-5 flex flex-col gap-5">
          <p className="font-bold text-vp-ink">Phân quyền vai trò hệ thống</p>
          {settings.roles.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-vp-canvas/70 p-4">
              <div><p className="text-sm font-bold text-vp-ink">{r.name}</p><p className="text-xs text-vp-muted">{r.desc}</p></div>
              <span className="text-xs text-vp-muted whitespace-nowrap">{r.count} tài khoản</span>
            </div>
          ))}
          <div className="border-t border-vp-border pt-5 flex flex-col gap-3">
            <p className="font-bold text-vp-ink">Chính sách bảo mật & Lưu trữ âm học</p>
            <div className="rounded-xl bg-vp-canvas/70 p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-vp-ink">Lưu trữ dữ liệu tệp Audio phát âm tối đa</p>
                <select
                  data-testid="retention-select"
                  aria-label="Số ngày lưu trữ audio"
                  value={settings.audioRetentionDays}
                  onChange={(e) => {
                    const days = Number(e.target.value);
                    runAdmin(admin, toast, "/settings", { method: "PUT", body: { audioRetentionDays: days } }, `Đã lưu: ${days} ngày`);
                  }}
                  className="rounded-lg border border-vp-border bg-white px-3 py-1.5 text-xs font-bold text-vp-ink"
                >
                  {RETENTION_OPTIONS.map((d) => <option key={d} value={d}>{d} Ngày</option>)}
                </select>
              </div>
              <p className="text-xs text-vp-muted">Hiện hệ thống chưa lưu file ghi âm của bé. Thiết lập này sẽ có hiệu lực khi tính năng lưu trữ được bật.</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 flex flex-col gap-3" data-testid="email-test">
          <p className="font-bold text-vp-ink">Kiểm tra gửi email</p>
          <p className="text-xs text-vp-muted">Gửi một thư thử để biết việc gửi mã xác thực qua email có hoạt động không. Nếu lỗi, thông báo bên dưới là lỗi thật từ nhà cung cấp.</p>
          <div className="flex gap-2">
            <input data-testid="email-test-to" type="email" value={mailTo} onChange={(e) => setMailTo(e.target.value)} placeholder="email nhận thư thử" className="h-10 flex-1 min-w-0 rounded-lg border border-vp-border px-3 text-sm" />
            <button data-testid="email-test-send" onClick={sendTestMail} disabled={!mailTo.trim()} className="h-10 rounded-lg bg-vp-blue px-4 text-sm font-bold text-white disabled:opacity-50">Gửi thử</button>
          </div>
          {mailResult && <p data-testid="email-test-result" className={`rounded-lg px-3 py-2 text-xs font-semibold ${mailResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{mailResult.text}</p>}
        </Card>
        <Card className="p-5 flex flex-col gap-3">
          <p className="font-bold text-vp-ink">Nhật ký hệ thống (Audit Logs)</p>
          <div className="flex flex-col divide-y divide-vp-border max-h-[420px] overflow-y-auto" data-testid="audit-log">
            {audit.length === 0 && <p className="py-3 text-sm text-vp-muted">Chưa có thao tác quản trị nào.</p>}
            {audit.map((a) => (
              <div key={a.id} className="py-3">
                <p className="text-sm text-vp-ink">{a.action}</p>
                <div className="flex justify-between text-[11px] text-vp-muted"><span>{a.actor}</span><span>{timeAgo(a.created_at)}</span></div>
              </div>
            ))}
          </div>
          <div className="border-t border-vp-border pt-3">
            <p className="text-sm font-bold text-vp-ink">Cổng thanh toán tích hợp</p>
            <p className="text-xs text-vp-muted">Môi trường: <b className="text-emerald-600">{settings.paymentEnv}</b></p>
          </div>
        </Card>
      </div>
      <Toast message={toast.message} tone={toast.tone} onDone={toast.clear} />
    </div>
  );
}
