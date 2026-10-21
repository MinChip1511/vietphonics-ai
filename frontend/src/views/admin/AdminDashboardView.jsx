import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, Tabs, Button } from "../../components/ui";
import { api } from "../../services/apiClient";
import { formatVnd } from "../../data/adminLabels";
import { AdminHeader, KpiCard, PANEL_TITLE, TABLE_WRAP, TABLE, THEAD, TH, TR, TD } from "./adminUi";

// Analytics overview. Every number comes from GET /api/admin/dashboard (aggregated from the database).
const RANGES = [
  { id: "today", label: "Hôm nay" },
  { id: "7d", label: "7 ngày qua" },
  { id: "30d", label: "30 ngày" },
  { id: "quarter", label: "Quý này" }
];
const RANGE_NOTE = { today: "hôm nay", "7d": "7 ngày qua", "30d": "30 ngày qua", quarter: "quý này" };
const num = (n) => Number(n || 0).toLocaleString("vi-VN");
const shortDate = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const clock = (iso) => {
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};
const deltaProps = (k) => (k.delta === null ? {} : { delta: `${Math.abs(k.delta)}%`, up: k.delta >= 0 });
const deltaHint = (k, base) => (k.delta === null ? `${base}${k.value ? " · chưa có kỳ trước để so sánh" : ""}` : base);

function Empty({ children }) {
  return <p className="rounded-lg bg-[#F8FAFC] px-4 py-6 text-center text-sm text-vp-muted">{children}</p>;
}

function Skeleton() {
  return (
    <div data-testid="admin-dashboard-skeleton" className="animate-pulse" aria-busy="true">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 mb-5">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-[118px] rounded-2xl bg-[#F1F5F9]" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-2 mb-5">
        <div className="h-72 rounded-2xl bg-[#F1F5F9]" /><div className="h-72 rounded-2xl bg-[#F1F5F9]" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2"><div className="h-60 rounded-2xl bg-[#F1F5F9]" /><div className="h-60 rounded-2xl bg-[#F1F5F9]" /></div>
    </div>
  );
}

// Day labels: at most ~8 are drawn, the last (today) is always drawn and highlighted.
function dayLabelEvery(count) { return Math.max(1, Math.ceil(count / 8)); }

function GrowthChart({ daily }) {
  const maxBar = Math.max(1, ...daily.map((d) => d.newParents));
  const maxLine = Math.max(1, ...daily.map((d) => d.attempts));
  const empty = daily.every((d) => !d.newParents && !d.attempts);
  const step = dayLabelEvery(daily.length);
  const points = daily.map((d, i) => `${((i + 0.5) / daily.length) * 100},${100 - (d.attempts / maxLine) * 92 - 4}`).join(" ");
  return (
    <Card flat className="p-6" data-testid="dash-growth">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <p className={PANEL_TITLE}>Tăng trưởng người dùng</p>
        <div className="flex items-center gap-4 text-xs text-vp-muted">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-vp-blue" />Phụ huynh mới</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-orange-500" />Lượt luyện</span>
        </div>
      </div>
      {empty ? <Empty>Chưa có phụ huynh mới hay lượt luyện nào trong khoảng này.</Empty> : (
        <>
          <div className="relative h-44">
            <div className="absolute inset-0 flex items-end gap-1">
              {daily.map((d, i) => (
                <div key={d.day} title={`${shortDate(d.day)}: ${d.newParents} phụ huynh mới, ${d.attempts} lượt luyện`} className="flex-1 h-full flex items-end justify-center">
                  <div className={`w-full max-w-6 rounded-t-md ${i === daily.length - 1 ? "bg-vp-blue" : "bg-vp-blue/40"}`} style={{ height: `${(d.newParents / maxBar) * 100}%`, minHeight: d.newParents ? 4 : 0 }} />
                </div>
              ))}
            </div>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <polyline points={points} fill="none" stroke="#F97316" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div className="flex gap-1 mt-2">
            {daily.map((d, i) => {
              const last = i === daily.length - 1;
              return <span key={d.day} className={`flex-1 text-center text-[11px] ${last ? "font-bold text-vp-blue" : "text-vp-muted"}`}>{last || (i % step === 0 && daily.length - 1 - i >= step) ? (last ? (daily.length > 8 ? "Nay" : "Hôm nay") : shortDate(d.day)) : ""}</span>;
            })}
          </div>
          <p className="mt-2 text-[11px] text-[#94A3B8]">Cột: tối đa {num(maxBar)} phụ huynh mới/ngày · đường: tối đa {num(maxLine)} lượt luyện/ngày</p>
        </>
      )}
    </Card>
  );
}

function RevenueChart({ daily, byPlan }) {
  const max = Math.max(1, ...daily.map((d) => d.revenue));
  const empty = daily.every((d) => !d.revenue);
  const step = dayLabelEvery(daily.length);
  return (
    <Card flat className="p-6 flex flex-col gap-4" data-testid="dash-revenue">
      <p className={PANEL_TITLE}>Doanh thu theo ngày</p>
      {empty ? <Empty>Chưa có đơn nào được thanh toán trong khoảng này.</Empty> : (
        <div>
          <div className="flex items-end gap-1 h-36">
            {daily.map((d, i) => (
              <div key={d.day} title={`${shortDate(d.day)}: ${formatVnd(d.revenue)}`} className="flex-1 h-full flex items-end justify-center">
                <div className={`w-full max-w-6 rounded-t-md ${i === daily.length - 1 ? "bg-vp-blue" : "bg-vp-blue/40"}`} style={{ height: `${(d.revenue / max) * 100}%`, minHeight: d.revenue ? 4 : 0 }} />
              </div>
            ))}
          </div>
          <div className="flex gap-1 mt-2">
            {daily.map((d, i) => {
              const last = i === daily.length - 1;
              return <span key={d.day} className={`flex-1 text-center text-[11px] ${last ? "font-bold text-vp-blue" : "text-vp-muted"}`}>{last ? (daily.length > 8 ? "Nay" : "Hôm nay") : i % step === 0 && daily.length - 1 - i >= step ? shortDate(d.day) : ""}</span>;
            })}
          </div>
          <p className="mt-2 text-[11px] text-[#94A3B8]">Cột cao nhất: {formatVnd(max)}</p>
        </div>
      )}
      <div className="border-t border-[#F1F5F9] pt-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-[#94A3B8]">Theo gói học</p>
        {byPlan.length === 0 && <p className="text-sm text-vp-muted">Chưa có gói nào được bán trong khoảng này.</p>}
        {byPlan.map((p) => (
          <div key={p.plan} className="flex items-center justify-between gap-2 text-[13px]">
            <span className="font-semibold text-[#0F172A]">{p.plan} <span className="font-normal text-vp-muted">· {p.orders} đơn · {p.buyers} người mua</span></span>
            <b className="text-[#0F172A]">{formatVnd(p.amount)}</b>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Funnel({ steps }) {
  const top = Math.max(1, steps[0]?.count || 0);
  return (
    <Card flat className="p-6 flex flex-col gap-4" data-testid="dash-funnel">
      <div>
        <p className={PANEL_TITLE}>Phễu chuyển đổi</p>
        <p className="text-xs text-vp-muted">Tính trên phụ huynh đăng ký trong khoảng này</p>
      </div>
      {!steps[0]?.count ? <Empty>Chưa có phụ huynh nào đăng ký trong khoảng này.</Empty> : steps.map((s, i) => (
        <div key={s.label}>
          <div className="flex items-center justify-between gap-2 text-[13px] mb-1">
            <span className="font-semibold text-[#0F172A]">{s.label}</span>
            <span className="text-vp-muted"><b className="text-[#0F172A]">{num(s.count)}</b>{i > 0 && s.ofPrevious !== null && <> · {s.ofPrevious}%{s.ofPrevious < 100 && <span className="text-red-500"> (-{Math.round((100 - s.ofPrevious) * 10) / 10}%)</span>}</>}</span>
          </div>
          <div className="h-3 rounded-full bg-[#F1F5F9]"><div className="h-3 rounded-full bg-vp-blue" style={{ width: `${(s.count / top) * 100}%`, opacity: 1 - i * 0.18, minWidth: s.count ? 6 : 0 }} /></div>
        </div>
      ))}
    </Card>
  );
}

function TopFamilies({ rows, label }) {
  return (
    <Card flat className="p-6 flex flex-col gap-3" data-testid="dash-top-families">
      <p className={PANEL_TITLE}>Top gia đình học nhiều nhất</p>
      {rows.length === 0 ? <Empty>Chưa có lượt luyện nào {label}.</Empty> : rows.map((f, i) => (
        <div key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-lg bg-[#F8FAFC] p-3">
          <span className="w-8 h-8 shrink-0 rounded-full bg-[#EFF6FF] grid place-items-center text-xs font-bold text-[#1978DC]">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#0F172A] truncate">{f.name}</p>
            <p className="text-xs text-vp-muted">{f.children} bé · gói {f.plan}</p>
          </div>
          <b className="text-[13px] text-[#0F172A]">{num(f.attempts)} lượt</b>
        </div>
      ))}
    </Card>
  );
}

function Buyers({ plans, recent, label }) {
  const paid = plans.filter((p) => p.monthly > 0);
  return (
    <Card flat className="p-6 flex flex-col gap-5" data-testid="dash-buyers">
      <p className={PANEL_TITLE}>Người mua theo gói</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {paid.map((p) => (
          <div key={p.id} className="rounded-xl border border-vp-border p-4">
            <p className="text-xs font-semibold text-[#94A3B8]">{p.name} {formatVnd(p.monthly)}</p>
            <p className="font-heading text-2xl font-bold text-[#0F172A]">{num(p.buyers)} <span className="text-sm font-semibold text-vp-muted">người mua</span></p>
            <p className="text-xs text-[#475569]">{num(p.orders)} đơn tổng · {num(p.rangeBuyers)} người / {num(p.rangeOrders)} đơn {label}</p>
          </div>
        ))}
      </div>
      <div className={TABLE_WRAP}>
        <p className="text-xs font-semibold text-[#94A3B8] mb-2">Người mua gần đây</p>
        {recent.length === 0 ? <Empty>Chưa có đơn nào được thanh toán.</Empty> : (
          <table className={TABLE}>
            <thead className={THEAD}><tr><th className={TH}>Khách hàng</th><th className={TH}>Email</th><th className={TH}>Gói</th><th className={`${TH} text-right`}>Số tiền</th><th className={TH}>Thanh toán lúc</th></tr></thead>
            <tbody>
              {recent.map((r, i) => (
                <tr key={i} className={TR}>
                  <td className={`${TD} font-semibold text-[#0F172A]`}>{r.customer}</td>
                  <td className={`${TD} text-vp-muted`}>{r.email}</td>
                  <td className={TD}>{r.plan}</td>
                  <td className={`${TD} text-right font-bold`}>{formatVnd(r.amount)}</td>
                  <td className={`${TD} text-vp-muted whitespace-nowrap`}>{new Date(r.paid_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}

export default function AdminDashboardView() {
  const [range, setRange] = useState("7d");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // State changes that start a fetch happen in the handlers; the effect only writes the answer.
  const pick = (id) => { setRange(id); setLoading(true); setError(null); };
  const refresh = () => { setLoading(true); setError(null); setTick((t) => t + 1); };

  useEffect(() => {
    let current = true;
    api(`/admin/dashboard?range=${range}`)
      .then((result) => { if (current) { setData(result); setLoading(false); } })
      .catch((e) => { if (current) { setError(e.message || "Không tải được số liệu."); setLoading(false); } });
    return () => { current = false; };
  }, [range, tick]);

  const k = data?.kpis;
  const label = RANGE_NOTE[range];
  return (
    <div className="max-w-[1200px]">
      <AdminHeader title="Trung tâm phân tích & tăng trưởng" subtitle={data ? `Số liệu tổng hợp từ cơ sở dữ liệu · Cập nhật lúc ${clock(data.generatedAt)}` : "Số liệu tổng hợp trực tiếp từ cơ sở dữ liệu của ứng dụng."} />
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Tabs tabs={RANGES} value={range} onChange={pick} />
        <Button data-testid="dash-refresh" variant="secondary" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Làm mới
        </Button>
      </div>

      {error && (
        <Card flat className="p-6 mb-5 flex flex-wrap items-center justify-between gap-3" role="alert">
          <p data-testid="dash-error" className="text-sm font-semibold text-red-500">{error}</p>
          <Button size="sm" onClick={refresh}>Thử lại</Button>
        </Card>
      )}
      {!data && loading && <Skeleton />}
      {data && (
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 mb-5">
            <KpiCard label="Gia đình hoạt động" value={num(k.activeFamilies.value)} {...deltaProps(k.activeFamilies)} hint={deltaHint(k.activeFamilies, `${num(k.newParents.value)} phụ huynh mới · ${num(k.totalParents)} tổng`)} />
            <KpiCard label="Lượt luyện phát âm" value={num(k.attempts.value)} {...deltaProps(k.attempts)} hint={deltaHint(k.attempts, `Kỳ trước: ${num(k.attempts.previous)} lượt`)} />
            <KpiCard label="Doanh thu" value={formatVnd(k.revenue.value)} {...deltaProps(k.revenue)} hint={`${num(k.revenue.paidOrders)} đơn · TB ${formatVnd(k.revenue.average)}/đơn`} />
            <KpiCard label="Chuyển đổi free → trả phí" value={`${k.conversion.percent}%`} hint={`${num(k.conversion.paidParents)}/${num(k.conversion.parents)} phụ huynh dùng gói trả phí`} />
          </div>
          <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-2 mb-5">
            <GrowthChart daily={data.daily} />
            <RevenueChart daily={data.daily} byPlan={data.revenueByPlan} />
          </div>
          <div className="grid gap-5 [&>*]:min-w-0 lg:grid-cols-2 mb-5">
            <Funnel steps={data.funnel} />
            <TopFamilies rows={data.topFamilies} label={label} />
          </div>
          <Buyers plans={data.buyersByPlan} recent={data.recentBuyers} label={label} />
        </div>
      )}
    </div>
  );
}
