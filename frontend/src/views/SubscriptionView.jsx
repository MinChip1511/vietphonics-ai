import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Card, PageHeader, Tabs, Badge } from "../components/ui";
import { SUBSCRIPTION_PLANS } from "../data/subscriptionData";
import { ORDER_STATUS, formatVnd } from "../data/adminLabels";
import { useStore } from "../services/store";
import { api } from "../services/apiClient";
import CheckoutModal from "./parent/CheckoutModal";

// Figma: 04 Parent UX / 07 / Screen-Subscription (7:1459) + checkout flow (Chọn gói → Tạo đơn → Thanh toán QR → Thành công).
export default function SubscriptionView({ onRequireLogin }) {
  const { user, plans, refreshUser } = useStore();
  const [billing, setBilling] = useState("yearly");
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const planId = user?.plan || "free";

  // Prices come from the server's price list; the marketing text per plan is presentation only.
  const catalog = SUBSCRIPTION_PLANS.map((p) => {
    const live = plans.find((x) => x.id === p.id);
    return live ? { ...p, monthlyPrice: live.monthly, yearlyPrice: live.yearly } : null;
  }).filter(Boolean);
  const current = catalog.find((p) => p.id === planId) || catalog[0];

  const [invoiceTick, setInvoiceTick] = useState(0);
  useEffect(() => {
    let alive = true;
    (async () => {
      const rows = user ? await api("/orders").catch(() => []) : [];
      if (alive) setInvoices(rows);
    })();
    return () => { alive = false; };
  }, [user, invoiceTick]);

  if (!current) return <p className="text-vp-muted">Đang tải bảng giá…</p>;
  const currentPrice = billing === "yearly" && current.yearlyPrice ? current.yearlyPrice : current.monthlyPrice;

  return (
    <div className="flex flex-col gap-6 max-w-[1080px]">
      <PageHeader subtitle="Xem gói học hiện tại, nâng cấp và tra cứu hóa đơn thanh toán." />

      <Card className="p-6 sm:p-8 rounded-3xl flex flex-col gap-6">
        <p className="text-xl font-bold text-vp-ink">Trạng thái gói học hiện tại</p>
        <div data-testid="current-plan" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border-[1.5px] border-vp-blue bg-blue-50 p-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase text-vp-blue">Gói {current.name}</span>
              {current.id !== "free" && <span className="rounded-md bg-vp-blue px-2 py-0.5 text-[9px] font-bold text-white">VIP MEMBER</span>}
            </div>
            <p className="font-heading text-2xl font-extrabold text-vp-ink">{current.id === "free" ? "Đang dùng thử miễn phí" : `VietPhonics AI ${current.name}`}</p>
            <p className="text-[13px] text-vp-muted">{current.description}</p>
          </div>
          <p className="font-heading text-[32px] font-extrabold text-vp-blue whitespace-nowrap">{current.id === "free" ? "0 VNĐ" : formatVnd(currentPrice)}</p>
        </div>
        {!user && (
          <p className="text-sm text-vp-muted">
            Ba mẹ chưa đăng nhập.{" "}
            <button onClick={onRequireLogin} className="font-bold text-vp-blue hover:underline">Đăng nhập</button> để đồng bộ gói học và hóa đơn.
          </p>
        )}
      </Card>

      <Card className="p-6 sm:p-8 rounded-3xl flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xl font-bold text-vp-ink">Nâng cấp gói học</p>
          <Tabs tabs={[{ id: "monthly", label: "Theo tháng" }, { id: "yearly", label: "Theo năm (tiết kiệm)" }]} value={billing} onChange={setBilling} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {catalog.map((plan) => {
            const isCurrent = plan.id === planId;
            const price = billing === "yearly" && plan.yearlyPrice ? plan.yearlyPrice : plan.monthlyPrice;
            const unit = billing === "yearly" && plan.yearlyPrice ? "/năm" : "/tháng";
            return (
              <div key={plan.id} data-testid={`plan-${plan.id}`} className={`relative flex flex-col gap-4 rounded-2xl border p-5 ${plan.popular ? "border-vp-blue border-2" : "border-vp-border"}`}>
                {plan.popular && <Badge tone="blue" className="absolute -top-3 left-5">Phổ biến nhất</Badge>}
                <div>
                  <p className="text-[11px] font-bold uppercase text-vp-muted">{plan.eyebrow}</p>
                  <p className="font-heading text-xl font-extrabold text-vp-ink">{plan.name}</p>
                </div>
                <p className="font-heading text-2xl font-extrabold text-vp-blue">{price ? formatVnd(price) : "0đ"}<span className="text-sm font-semibold text-vp-muted">{price ? unit : ""}</span></p>
                <ul className="flex flex-col gap-2 text-sm text-vp-ink flex-1">
                  {plan.features.map((f) => <li key={f} className="flex gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />{f}</li>)}
                </ul>
                <button
                  disabled={isCurrent || plan.id === "free" || !user}
                  onClick={() => setCheckoutPlan(plan)}
                  className={`h-11 rounded-full text-sm font-bold ${isCurrent ? "bg-vp-pill text-vp-muted" : "bg-vp-blue text-white hover:brightness-110"}`}
                >
                  {isCurrent ? "Gói hiện tại" : plan.id === "free" ? "Gói miễn phí" : plan.cta}
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 sm:p-8 rounded-3xl flex flex-col gap-4">
        <p className="text-xl font-bold text-vp-ink">Hóa đơn & Lịch sử thanh toán</p>
        {invoices.length === 0 && <p className="text-sm text-vp-muted">Chưa có hóa đơn nào{user ? "" : " (cần đăng nhập)"}.</p>}
        {invoices.map((o) => (
          <div key={o.id} className="flex items-start justify-between gap-3 rounded-xl border border-vp-border p-4">
            <div>
              <p className="text-sm font-bold text-vp-ink">Mã đơn hàng #{o.id}</p>
              <p className="text-xs text-vp-muted">{o.plan} • {o.created_at?.slice(0, 16).replace("T", " ")} qua {o.method}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-vp-ink whitespace-nowrap">{o.amount.toLocaleString("vi-VN")} VNĐ</p>
              <p className={`text-xs font-semibold ${o.status === "paid" ? "text-emerald-500" : "text-vp-muted"}`}>{ORDER_STATUS[o.status]?.label}</p>
            </div>
          </div>
        ))}
      </Card>

      {checkoutPlan && (
        <CheckoutModal
          plan={checkoutPlan}
          billing={billing}
          onClose={() => setCheckoutPlan(null)}
          onPaid={() => { refreshUser(); setInvoiceTick((t) => t + 1); }}
        />
      )}
    </div>
  );
}
