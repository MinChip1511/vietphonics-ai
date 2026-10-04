import React from "react";
import { Activity } from "lucide-react";
import { Card } from "../../components/ui";
import { useStore } from "../../services/store";
import { AdminHeader, AdminLoading } from "./adminUi";

// Figma: 07 Admin / 09 / admin-analytics (20:1453). Counted from the database; metrics that need
// separate tracking (retention, traffic sources, infrastructure cost) are not shown until they exist.
const SOUND_LABEL = { initial: "Phụ âm đầu", final: "Âm cuối", tone: "Thanh điệu" };
const dayLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("vi-VN", { weekday: "short" });

export default function AdminAnalyticsView() {
  const { admin } = useStore();
  if (!admin.data) return <AdminLoading />;
  const m = admin.data.metrics;
  const maxAttempts = Math.max(1, ...m.attemptsDaily.map((d) => d.count));
  const conversion = m.parents ? ((m.paidParents / m.parents) * 100).toFixed(1) : "0";

  const kpis = [
    { label: "Tài khoản phụ huynh", value: m.parents, hint: "Đã đăng ký" },
    { label: "Hồ sơ bé", value: m.children, hint: "Đang được quản lý" },
    { label: "Lượt luyện phát âm", value: m.attempts, hint: "Đã chấm và lưu" },
    { label: "Chuyển đổi Free-to-Paid", value: `${conversion}%`, hint: `${m.paidParents}/${m.parents} phụ huynh trả phí` }
  ];

  return (
    <div className="max-w-[1200px]">
      <AdminHeader />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5 rounded-2xl flex flex-col gap-2">
            <p className="text-xs text-vp-muted">{k.label}</p>
            <p className="font-heading text-2xl font-extrabold text-vp-ink">{typeof k.value === "number" ? k.value.toLocaleString("vi-VN") : k.value}</p>
            <p className="text-[11px] text-vp-muted">{k.hint}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 [&>*]:min-w-0 lg:grid-cols-[1.5fr_1fr] mb-6">
        <Card className="p-5">
          <p className="font-bold text-vp-ink mb-4">Lượt luyện phát âm 7 ngày qua</p>
          <div className="flex items-end gap-3 sm:gap-6 h-44 px-2">
            {m.attemptsDaily.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-1 h-full" title={`${d.day}: ${d.count} lượt`}>
                <span className="text-[10px] font-bold text-vp-muted">{d.count}</span>
                <div className="w-full max-w-9 rounded-t-md bg-vp-blue" style={{ height: `${(d.count / maxAttempts) * 100}%`, minHeight: d.count ? 4 : 0 }} />
                <span className="text-xs text-vp-muted">{dayLabel(d.day)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5 flex flex-col gap-3">
          <p className="font-bold text-vp-ink">Tỷ lệ đọc đúng theo nhóm âm (toàn hệ thống)</p>
          {Object.entries(SOUND_LABEL).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-vp-ink">{label}</span>
              <b className="text-vp-ink">{m.soundAccuracy[key] == null ? "Chưa có dữ liệu" : `${m.soundAccuracy[key]}%`}</b>
            </div>
          ))}
        </Card>
      </div>
      <Card className="p-5 flex items-start gap-3">
        <Activity className="w-5 h-5 text-orange-500 shrink-0" />
        <div>
          <p className="font-bold text-vp-ink">Giữ chân người dùng, nguồn truy cập, chi phí hạ tầng <span className="ml-1 rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-500">PHASE 2</span></p>
          <p className="text-xs text-vp-muted">Các chỉ số này cần hệ thống theo dõi riêng nên chưa hiển thị, tránh dùng số liệu không có thật.</p>
        </div>
      </Card>
    </div>
  );
}
