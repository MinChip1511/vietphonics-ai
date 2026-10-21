import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Modal, Button, inputClass } from "../../components/ui";
import { api } from "../../services/apiClient";
import { formatVnd } from "../../data/adminLabels";
import { qrCells } from "../../data/coupons";

const DEMO_METHODS = ["QR ngân hàng", "MoMo", "VNPay"];
const POLL_MS = 3000;
// The shop's own receiving QR codes (public/pay): the customer scans, transfers, and an admin confirms the money arrived.
const MANUAL_QR = {
  "Chuyển khoản VNPay": { image: "/pay/vnpay-qr.jpeg", app: "VNPay" },
  "Chuyển khoản MoMo": { image: "/pay/momo-qr.jpeg", app: "MoMo" }
};

// Placeholder pattern, not a payable QR: used only by the simulated payment (development).
function FakeQr({ seed }) {
  const cells = useMemo(() => qrCells(seed), [seed]);
  return (
    <svg viewBox="0 0 21 21" className="w-44 h-44 rounded-xl bg-white p-2 border border-vp-border" data-testid="fake-qr" aria-label="Mã QR thanh toán (mô phỏng)">
      {cells.map((on, i) => on && <rect key={i} x={i % 21} y={Math.floor(i / 21)} width="1" height="1" fill="#0D3577" />)}
    </svg>
  );
}

// The server computes every price (plan list + coupon rules); this screen only shows what it returns.
export default function CheckoutModal({ plan, billing, onClose, onPaid }) {
  const period = billing === "yearly" && plan?.yearlyPrice ? "yearly" : "monthly";
  const [code, setCode] = useState("");
  const [quote, setQuote] = useState(null); // {base, price, coupon}
  const [error, setError] = useState(null);
  const [methods, setMethods] = useState(null); // what the server offers; null while loading
  const [demo, setDemo] = useState(false);
  const [method, setMethod] = useState("");
  const [momo, setMomo] = useState(null); // {qrCode, payUrl} of a live MoMo payment
  const [step, setStep] = useState("review"); // review | pay | done
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const isMomo = method === "MoMo" && momo;
  const manualQr = MANUAL_QR[method];

  useEffect(() => {
    let alive = true;
    api("/payments/config").then((cfg) => {
      if (!alive) return;
      const manual = (cfg.manual || []).filter((m) => MANUAL_QR[m]);
      const list = [...(cfg.momo ? ["MoMo"] : []), ...manual, ...(cfg.demo ? DEMO_METHODS.filter((m) => !(m === "MoMo" && cfg.momo)) : [])];
      setMethods(list);
      setDemo(cfg.demo);
      setMethod(list[0] || "");
    }).catch(() => alive && setMethods([]));
    return () => { alive = false; };
  }, []);

  // A live MoMo payment confirms itself: poll the order until the server (MoMo's callback) marks it paid.
  useEffect(() => {
    if (step !== "pay" || !isMomo || !order) return undefined;
    const timer = setInterval(async () => {
      try {
        const fresh = await api(`/orders/${order.id}`);
        if (fresh.status === "paid") { setOrder(fresh); setStep("done"); onPaid(); }
        else if (fresh.status === "failed") { setError("Thanh toán không thành công. Bạn có thể thử lại."); setStep("review"); setMomo(null); }
      } catch { /* a network blip: the next tick retries */ }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [step, isMomo, order, onPaid]);

  if (!plan) return null;

  const base = period === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
  const price = quote?.price ?? base;
  const label = `Gói ${plan.name} ${period === "yearly" ? "1 Năm" : "1 Tháng"}`;

  const check = async (value) => {
    setCode(value);
    setError(null);
    if (!value.trim()) return setQuote(null);
    try {
      setQuote(await api("/coupons/validate", { method: "POST", body: { plan_id: plan.id, period, code: value.trim() } }));
    } catch (err) {
      setQuote(null);
      setError(err.message);
    }
  };

  const createOrder = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await api("/orders", { method: "POST", body: { plan_id: plan.id, period, coupon: quote?.coupon ? code.trim() : null, method } });
      if (method === "MoMo" && !created.method.includes("mô phỏng")) setMomo(await api(`/orders/${created.id}/pay`, { method: "POST" }));
      setOrder(created);
      setStep("pay");
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  const confirmPaid = async () => {
    setBusy(true);
    setError(null);
    try {
      setOrder(await api(`/orders/${order.id}/confirm-demo`, { method: "POST" }));
      setStep("done");
      onPaid();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  };

  return (
    <Modal open onClose={onClose} title={step === "done" ? "Thanh toán thành công" : step === "waiting" ? "Đang chờ xác nhận" : `Nâng cấp ${label}`}>
      {step === "review" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-vp-canvas p-4 flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><span className="text-vp-muted">Gói học</span><span className="font-bold text-vp-ink">{label}</span></div>
            <div className="flex justify-between"><span className="text-vp-muted">Giá gốc</span><span className="text-vp-ink">{formatVnd(base)}</span></div>
            {quote?.coupon && <div className="flex justify-between text-emerald-600"><span>Mã {quote.coupon.id}</span><span>-{formatVnd(base - price)}</span></div>}
            <div className="flex justify-between border-t border-vp-border pt-2"><span className="font-bold text-vp-ink">Tổng thanh toán</span><span data-testid="checkout-total" className="font-heading text-xl font-extrabold text-vp-blue">{formatVnd(price)}</span></div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-vp-ink">Mã giảm giá</span>
            <input data-testid="coupon-input" className={inputClass} value={code} onChange={(e) => check(e.target.value)} placeholder="VD: PHUTRAI20" />
            {error && <span className="text-xs text-red-500">{error}</span>}
          </label>
          {methods && methods.length === 0 && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">Thanh toán trực tuyến hiện chưa khả dụng. Vui lòng liên hệ hotline để được hỗ trợ.</p>}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-vp-ink">Phương thức thanh toán</span>
            <div className="flex flex-wrap gap-2">
              {(methods || []).map((m) => (
                <button key={m} onClick={() => setMethod(m)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${method === m ? "border-vp-blue bg-vp-sky text-vp-blue" : "border-vp-border text-vp-ink"}`}>{m}</button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Hủy</Button>
            <Button data-testid="checkout-next" onClick={createOrder} disabled={busy || !method}>Tạo đơn hàng</Button>
          </div>
        </div>
      )}

      {step === "pay" && order && manualQr && (
        <div className="flex flex-col items-center gap-3 text-center" data-testid="manual-pay">
          <p className="text-sm text-vp-muted">Mở ứng dụng {manualQr.app} hoặc ngân hàng, quét mã dưới đây và chuyển đúng số tiền.</p>
          <img src={manualQr.image} alt={`Mã QR nhận tiền ${manualQr.app}`} className="w-60 rounded-2xl border border-vp-border" data-testid="manual-qr" />
          <p className="font-heading text-2xl font-extrabold text-vp-blue">{formatVnd(order.amount)}</p>
          <div className="w-full rounded-2xl bg-vp-canvas p-3 text-left text-sm text-vp-ink">
            <p>Nội dung chuyển khoản: <b data-testid="manual-note">{order.id}</b></p>
            <p className="text-xs text-vp-muted mt-1">Vui lòng ghi đúng nội dung này để chúng tôi nhận ra khoản chuyển của bạn.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep("review")}>Quay lại</Button>
            <Button data-testid="manual-sent" onClick={() => { setStep("waiting"); onPaid(); }}>Tôi đã chuyển khoản</Button>
          </div>
        </div>
      )}

      {step === "waiting" && (
        <div className="flex flex-col items-center gap-3 text-center" data-testid="manual-waiting">
          <CheckCircle2 className="w-16 h-16 text-vp-blue" />
          <p className="font-bold text-vp-ink">Đã ghi nhận đơn {order?.id}.</p>
          <p className="text-sm text-vp-muted">Gói {label} sẽ được kích hoạt sau khi chúng tôi xác nhận đã nhận được tiền. Bạn có thể theo dõi trạng thái ở mục lịch sử đơn hàng.</p>
          <Button onClick={onClose}>Đóng</Button>
        </div>
      )}

      {step === "pay" && order && isMomo && (
        <div className="flex flex-col items-center gap-4 text-center" data-testid="momo-pay">
          <p className="text-sm text-vp-muted">Mở ứng dụng MoMo và quét mã để thanh toán đơn <b className="text-vp-ink">{order.id}</b></p>
          <div className="rounded-2xl border border-vp-border bg-white p-3">
            <QRCodeSVG value={momo.qrCode || momo.payUrl} size={192} marginSize={1} aria-label="Mã QR thanh toán MoMo" data-testid="momo-qr" />
          </div>
          <p className="font-heading text-2xl font-extrabold text-vp-blue">{formatVnd(order.amount)}</p>
          {momo.payUrl && (
            <a href={momo.payUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-vp-blue underline">
              Thanh toán trên trang MoMo <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <p className="text-xs text-vp-muted">Đang chờ thanh toán... Trang sẽ tự cập nhật khi MoMo xác nhận.</p>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button variant="ghost" onClick={() => { setStep("review"); setMomo(null); }}>Quay lại</Button>
        </div>
      )}

      {step === "pay" && order && !isMomo && !manualQr && (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-vp-muted">Quét mã bằng ứng dụng {method} để thanh toán đơn <b className="text-vp-ink">{order.id}</b></p>
          <FakeQr seed={order.id + method} />
          <p className="font-heading text-2xl font-extrabold text-vp-blue">{formatVnd(order.amount)}</p>
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">Môi trường thử nghiệm: chưa kết nối cổng thanh toán nên không có giao dịch thật. Bấm nút dưới để giả lập thanh toán thành công.</p>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep("review")} disabled={busy}>Quay lại</Button>
            {demo && <Button data-testid="checkout-paid" onClick={confirmPaid} disabled={busy}>Tôi đã thanh toán</Button>}
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500" />
          <p className="font-bold text-vp-ink">Đơn {order?.id} đã được xác nhận.</p>
          <p className="text-sm text-vp-muted">{label} đã được kích hoạt cho gia đình. Chúc bé học vui!</p>
          <Button onClick={onClose}>Hoàn tất</Button>
        </div>
      )}
    </Modal>
  );
}
