import React, { useState } from "react";
import { Mic } from "lucide-react";
import MascotBubble from "../../components/MascotBubble";

// Figma: 03 Child UX / 12 / microphone-permission (27:2469)
export function MicPermissionScreen({ onRetry }) {
  return (
    <div className="flex flex-col gap-6 min-h-[60vh]" data-testid="mic-permission">
      <h2 className="font-heading text-2xl font-extrabold text-vp-ink">Cấp quyền truy cập</h2>
      <MascotBubble message="Để tớ nghe thấy bé phát âm siêu như thế nào, bé hãy đồng ý cấp quyền microphone cho tớ nha!" />
      <div className="rounded-3xl border border-vp-border bg-white p-8 sm:p-10 flex flex-col items-center gap-4 text-center">
        <div className="w-24 h-24 rounded-full bg-blue-50 grid place-items-center">
          <Mic className="w-10 h-10 text-vp-blue" strokeWidth={1.5} />
        </div>
        <p className="font-heading text-xl sm:text-2xl font-extrabold text-vp-ink">Bấm "Cho phép" (Allow) trên màn hình</p>
        <p className="max-w-lg text-sm text-vp-muted">
          Trình duyệt hoặc hệ thống sẽ hiện ra một thông báo nhỏ yêu cầu quyền thu âm. Phụ huynh hãy xác nhận "Cho phép" để tiếp tục.
          Nếu đã lỡ chặn, hãy bấm biểu tượng ổ khóa cạnh thanh địa chỉ để bật lại micro.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="mt-auto self-center w-full max-w-[400px] rounded-3xl bg-vp-blue px-12 py-[18px] font-heading text-xl font-extrabold text-white hover:brightness-110"
      >
        Tôi đã cấp quyền - Thử lại
      </button>
    </div>
  );
}

// Shown only when they are the detected problem (not part of the Figma list of three).
const EXTRA_ISSUES = [
  {
    id: "unsupported",
    title: "Trình duyệt này không cho phép ghi âm",
    body: "Trang đang mở ở nơi không hỗ trợ micro (ví dụ khung xem trước trong VS Code, hoặc địa chỉ http:// qua mạng LAN). Hãy mở bằng Chrome/Safari tại http://localhost:5173 hoặc qua https.",
    dot: "bg-red-500",
    border: "border-red-400"
  },
  {
    id: "empty",
    title: "Chưa thu được âm thanh nào",
    body: "Bản ghi quá ngắn hoặc micro không gửi âm thanh. Bé hãy bấm micro, nói to rõ rồi mới bấm dừng nhé.",
    dot: "bg-amber-500",
    border: "border-amber-400"
  },
  {
    id: "failed",
    title: "Không khởi động được micro",
    body: "Trình duyệt báo lỗi khi mở micro. Hãy đóng các ứng dụng khác đang dùng micro rồi thử lại.",
    dot: "bg-red-500",
    border: "border-red-400"
  }
];

const ISSUES = [
  {
    id: "noise",
    title: "Môi trường xung quanh quá ồn",
    body: "Phát hiện tạp âm từ tivi hoặc người nói chuyện bên cạnh. Bé yêu hãy di chuyển đến nơi yên tĩnh hơn để Cá Xanh nghe thật rõ nhé!",
    dot: "bg-amber-500",
    border: "border-amber-400"
  },
  {
    id: "device",
    title: "Lỗi kết nối Microphone",
    body: "Thiết bị không tìm thấy micro hoặc quyền thu âm đã bị chặn. Phụ huynh vui lòng kiểm tra cài đặt microphone của trình duyệt.",
    dot: "bg-red-500",
    border: "border-red-400"
  },
  {
    id: "network",
    title: "Kết nối mạng không ổn định",
    body: "Không thể gửi file âm thanh lên hệ thống AI phân tích. Vui lòng kiểm tra sóng Wifi hoặc mạng di động trên thiết bị.",
    dot: "bg-blue-500",
    border: "border-blue-400"
  }
];

// Figma: 03 Child UX / 13 / recording-errors (27:2470)
export function RecordingErrorsScreen({ active, onRescan }) {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const rescan = async () => {
    setScanning(true);
    const found = [];
    if (!navigator.onLine) found.push("network");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      found.push("unsupported");
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        found.push("device");
      }
    }
    setScanning(false);
    setScanResult(found);
    if (found.length === 0) onRescan();
  };

  const flagged = scanResult ?? [active];
  const issues = [...EXTRA_ISSUES.filter((i) => flagged.includes(i.id)), ...ISSUES];

  return (
    <div className="flex flex-col gap-5 min-h-[60vh]" data-testid="recording-errors">
      <h2 className="font-heading text-2xl font-extrabold text-vp-ink">Chuẩn đoán môi trường học</h2>
      {issues.map((issue) => {
        const on = flagged.includes(issue.id);
        return (
          <div
            key={issue.id}
            className={`rounded-2xl border bg-white p-5 transition-opacity ${on ? issue.border : "border-vp-border opacity-60"}`}
          >
            <p className="flex items-center gap-3 font-bold text-vp-ink">
              <span className={`w-2 h-2 rounded-full ${issue.dot}`} /> {issue.title}
              {on && <span className="ml-auto text-[11px] font-bold uppercase text-red-500">Phát hiện</span>}
            </p>
            <p className="mt-2 text-sm text-vp-muted">{issue.body}</p>
          </div>
        );
      })}
      <button
        onClick={rescan}
        disabled={scanning}
        className="mt-auto self-center w-full max-w-[400px] rounded-3xl bg-vp-blue px-12 py-[18px] font-heading text-xl font-extrabold text-white hover:brightness-110 disabled:opacity-60"
      >
        {scanning ? "Đang quét..." : "Quét lại hệ thống âm thanh"}
      </button>
    </div>
  );
}
