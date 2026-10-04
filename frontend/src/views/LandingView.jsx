import React, { useState } from "react";
import { ArrowUpRight, ArrowRight, Play, ChevronRight, CircleCheck } from "lucide-react";
import { HOTLINE } from "../constants";
import { speakVietnamese } from "../services/audioService";
import avatar1 from "../assets/landing/avatar-1.png";
import avatar2 from "../assets/landing/avatar-2.png";
import avatar3 from "../assets/landing/avatar-3.png";
import heroKids from "../assets/landing/hero-kids.jpg";
import heroVideo from "../assets/landing/hero-video.jpg";
import about1 from "../assets/landing/about-1.jpg";
import about2 from "../assets/landing/about-2.jpg";
import service1 from "../assets/landing/service-1.jpg";
import service2 from "../assets/landing/service-2.jpg";
import progressPhoto from "../assets/landing/progress-photo.jpg";
import gallery1 from "../assets/landing/gallery-1.jpg";
import gallery2 from "../assets/landing/gallery-2.jpg";
import galleryThumb from "../assets/landing/gallery-thumb.jpg";
import demo1 from "../assets/landing/demo-1.jpg";
import demo2 from "../assets/landing/demo-2.jpg";
import demo3 from "../assets/landing/demo-3.jpg";
import testimonial1 from "../assets/landing/testimonial-1.png";
import testimonial2 from "../assets/landing/testimonial-2.png";
import footerPhoto from "../assets/landing/footer-photo.jpg";
import socialIcons from "../assets/landing/social-icons.svg";

// Figma: VietPhonics AI landing (1:2) — Hero 1:3, About 1:88, Services 1:118, Progress 1:147,
// Gallery 1:182, Demo 1:208, Testimonial 1:224, Footer 1:244.
const INK = "text-[#2e2e2e]";
const H2 = `font-heading font-medium leading-[1.2] ${INK} text-4xl sm:text-5xl lg:text-[64px]`;
const INTRO = "Xin chào ba mẹ và các bé! VietPhonics AI giúp bé luyện đọc và phát âm tiếng Việt qua những bài học ngắn, vui nhộn, có trí tuệ nhân tạo lắng nghe và khen ngợi bé mỗi ngày.";

function Avatars({ light }) {
  return (
    <div className="flex -space-x-4">
      {[avatar1, avatar2, avatar3].map((src, i) => (
        <img key={i} src={src} alt="" className={`w-[72px] h-[72px] rounded-full object-cover border-2 ${light ? "border-vp-blue" : "border-white"}`} />
      ))}
    </div>
  );
}

function PillButton({ children, onClick, variant = "solid", className = "", ...props }) {
  const styles = {
    solid: "bg-vp-blue text-white hover:brightness-110",
    outline: `border border-[#2e2e2e] ${INK} hover:bg-white`,
    blueOutline: `border border-vp-blue ${INK} hover:bg-vp-sky`,
    soft: `bg-vp-canvas ${INK}`
  };
  return (
    <button onClick={onClick} className={`inline-flex items-center justify-center rounded-[15px] px-5 py-2.5 text-base ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Hero({ onStartLearning }) {
  return (
    <section className="grid gap-8 lg:grid-cols-[508px_1fr] lg:gap-12 pt-6 lg:pt-12">
      <div className="relative rounded-[28px] lg:rounded-tr-[120px] bg-vp-blue p-6 sm:p-10 text-white flex flex-col gap-8 lg:min-h-[661px]">
        <button
          onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
          className="absolute hidden lg:grid -right-14 -top-2 w-[120px] h-[120px] rounded-full border border-[#2e2e2e] place-items-center"
          aria-label="Khám phá"
        >
          <ArrowUpRight className="w-8 h-8 text-[#2e2e2e]" strokeWidth={1.25} />
          <span className={`absolute -top-3 left-[76px] whitespace-nowrap rounded-[15px] bg-vp-canvas px-4 py-2 text-base ${INK}`}>Khám phá</span>
        </button>
        <div className="flex flex-col gap-3">
          <Avatars light />
          <p className="text-base">Học đọc tiếng Việt cùng AI</p>
        </div>
        <div className="mt-auto flex flex-col gap-3">
          <h1 className="font-heading text-3xl sm:text-[36px] font-medium leading-[1.3]">Giúp bé đọc đúng, phát âm tốt và tự tin hơn mỗi ngày</h1>
          <p className="text-lg sm:text-xl leading-[1.3]">VietPhonics AI giúp trẻ 4–7 tuổi luyện đọc và phát âm tiếng Việt qua những bài học ngắn, trực quan và vui nhộn. Bé nghe mẫu, đọc theo và nhận phản hồi nhẹ nhàng từ AI.</p>
        </div>
        <div className="flex items-end gap-4">
          <img src={heroKids} alt="Các bé đang đọc sách" className="h-[135px] w-full max-w-[290px] rounded-[20px] object-cover" style={{ objectPosition: "50% 92%" }} />
          <button onClick={onStartLearning} aria-label="Bắt đầu học" className="mb-2"><ArrowRight className="w-6 h-6" /></button>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <div className="flex sm:justify-end">
          <div className="relative self-start">
            <img src={heroVideo} alt="Bé luyện phát âm cùng VietPhonics AI" className="h-[120px] w-[210px] rounded-[15px] object-cover" />
            <button onClick={() => speakVietnamese(INTRO)} aria-label="Nghe giới thiệu" className="absolute inset-0 m-auto w-9 h-9 rounded-full bg-vp-blue text-white grid place-items-center">
              <Play className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>
        <PillButton variant="outline" onClick={onStartLearning} className="self-start">Bài học tương tác</PillButton>
        <h2 className={`font-heading font-medium leading-[1.3] ${INK} text-5xl sm:text-6xl lg:text-[80px]`}>VietPhonics AI<br />là gì?</h2>
        <PillButton data-testid="landing-start" id="btn-start-learning" onClick={onStartLearning} className="self-start">Bắt đầu học</PillButton>
      </div>
    </section>
  );
}

function About({ onStartLearning, onSignup }) {
  return (
    <section id="about" className="grid gap-8 lg:grid-cols-[500px_1fr] lg:gap-16">
      <div className="rounded-[28px] lg:rounded-tr-[120px] bg-white p-6 sm:p-10 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Avatars />
        </div>
        <p className={`text-base leading-[1.3] ${INK}`}>VietPhonics AI là nền tảng luyện đọc và phát âm tiếng Việt dành cho trẻ 4–7 tuổi. Bé học qua các bài tập ngắn, nghe mẫu và tự đọc vào micro để nhận phản hồi từ AI.</p>
        <div className="relative">
          <img src={about1} alt="Bé đang tô màu học chữ" className="h-[193px] w-full max-w-[317px] rounded-[20px] object-cover" />
          <button onClick={onStartLearning} aria-label="Bắt đầu" className="absolute bottom-3 left-[270px] hidden sm:grid w-9 h-9 rounded-full bg-vp-blue text-white place-items-center"><ArrowRight className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="flex flex-col gap-8">
        <h2 className={H2}>Học đúng cách ngay từ đầu</h2>
        <div className="relative">
          <img src={about2} alt="Bé luyện viết chữ" className="h-[175px] sm:h-[220px] w-full max-w-[460px] rounded-[15px] object-cover" />
          <button onClick={() => speakVietnamese(INTRO)} aria-label="Nghe giới thiệu" className="absolute left-[200px] top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-vp-blue text-white grid place-items-center"><Play className="w-6 h-6 fill-current" /></button>
        </div>
        <div className="flex flex-wrap gap-4">
          <PillButton onClick={onStartLearning}>Bắt đầu ngay</PillButton>
          <PillButton variant="outline" onClick={onSignup}>Tìm hiểu thêm</PillButton>
        </div>
      </div>
    </section>
  );
}

const SERVICE_TABS = {
  learn: "Nghe mẫu, đọc theo và nhận phản hồi ngay trong một luồng học.",
  smooth: "Chuyển từ bài này sang bài khác liền mạch, không cần chờ đợi.",
  safe: "Giọng nói của bé được xử lý an toàn và không chia sẻ cho bên thứ ba."
};

function Services({ onStartLearning }) {
  const [tab, setTab] = useState("learn");
  const steps = [
    { title: "Nghe mẫu", body: "Bé nghe cách phát âm của âm, từ hoặc câu." },
    { title: "Đọc theo", body: "Bé nhấn micro và đọc lại bằng giọng của mình." },
    { title: "AI phản hồi", body: "VietPhonics AI phân tích phần đọc và đưa ra phản hồi phù hợp." },
    { title: "Luyện lại", body: "Nếu cần, bé nghe mẫu chậm hơn và thử lại để cải thiện." }
  ];
  return (
    <section className="flex flex-col gap-10">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <h2 className={`${H2} max-w-[612px]`}>Mỗi bài học là một bước tiến nhỏ</h2>
        <div className="flex flex-col gap-2 lg:mt-16">
          <div className="flex flex-wrap gap-3">
            {[["learn", "Learn"], ["smooth", "Liền mạch"], ["safe", "An toàn"]].map(([id, label]) => (
              <PillButton key={id} variant={tab === id ? "solid" : "blueOutline"} onClick={() => setTab(id)} className="w-28 h-10">{label}</PillButton>
            ))}
          </div>
          <p className={`text-sm ${INK} max-w-sm`}>{SERVICE_TABS[tab]}</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col justify-between gap-8">
          <p className={`flex items-end gap-4 font-heading text-4xl lg:text-5xl leading-[1.3] ${INK}`}>Bắt đầu thật dễ dàng <ArrowRight className="w-8 h-8 mb-3 shrink-0" strokeWidth={1.25} /></p>
          <div className="flex flex-col gap-6">
            <PillButton onClick={onStartLearning} className="self-start">Nhập Vietphonics Ai</PillButton>
            <div className="flex gap-4">
              <img src={service1} alt="" className="h-[140px] w-[170px] rounded-3xl object-cover" />
              <img src={service2} alt="" className="h-[140px] w-[170px] rounded-3xl object-cover" />
            </div>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {steps.map((s) => (
            <div key={s.title} className="rounded-[20px] bg-white p-7 flex flex-col justify-between gap-16 min-h-[240px] lg:min-h-[319px]">
              <p className={`font-heading text-[32px] leading-[1.3] ${INK}`}>{s.title}</p>
              <p className={`text-xl leading-[1.3] ${INK}`}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProgressSection({ onOpenParentDashboard }) {
  const [tab, setTab] = useState("kids");
  const value = { kids: 97, smooth: 92, safe: 100 }[tab];
  const r = 70;
  const circ = 2 * Math.PI * r;
  return (
    <section className="flex flex-col gap-10">
      <div className="flex flex-col lg:flex-row justify-between gap-6">
        <h2 className={`${H2} max-w-[728px]`}>Một cách học phù hợp với trẻ 4–7 tuổi</h2>
        <p className={`text-xl leading-[1.3] ${INK} max-w-[460px] lg:mt-16`}>Không cần những bài học dài hay nhiều chữ. VietPhonics AI tập trung vào những hoạt động ngắn, trực quan và có hướng dẫn bằng giọng nói để bé dễ dàng bắt đầu.</p>
      </div>
      <div className="rounded-[20px] bg-white p-6 sm:p-12 flex flex-col gap-10">
        <div className="flex flex-wrap items-center justify-end gap-4">
          <div className="flex flex-wrap gap-3">
            {[["kids", "Trẻ em"], ["smooth", "Liền mạch"], ["safe", "An toàn"]].map(([id, label]) => (
              <PillButton key={id} variant={tab === id ? "solid" : "blueOutline"} onClick={() => setTab(id)}>{label}</PillButton>
            ))}
          </div>
        </div>
        <div className="grid gap-8 lg:grid-cols-[340px_1fr_auto] items-center">
          <div className="flex flex-col gap-10">
            <div className="rounded-3xl bg-vp-canvas p-6 flex flex-col gap-4">
              <p className={`flex items-center gap-3 text-xl ${INK}`}><CircleCheck className="w-5 h-5 text-vp-blue" /> Học Thông Minh</p>
              <p className="text-base font-medium text-[#bababa]">Tiến trình</p>
              <p className="text-sm text-[#bababa] -mt-3">Thông tin cho mỗi bước học tập</p>
              <div className="h-[13px] rounded-[10px] bg-white overflow-hidden"><div className="h-full bg-vp-blue" style={{ width: `${value / 2}%` }} /></div>
              <p className={`text-xs ${INK}`}>Tiến trình trong 30 ngày</p>
            </div>
            <PillButton onClick={onOpenParentDashboard} className="self-start">Khám phá thêm</PillButton>
          </div>
          <img src={progressPhoto} alt="Bé đang làm bài tập" className="h-[260px] sm:h-[344px] w-full rounded-[20px] object-cover" />
          <div className="relative w-[200px] h-[200px] mx-auto">
            <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90" aria-hidden="true">
              <circle cx="80" cy="80" r={r} fill="none" stroke="#EEF1FA" strokeWidth="12" />
              <circle cx="80" cy="80" r={r} fill="none" stroke="#1978DC" strokeWidth="12" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - value / 100)} />
            </svg>
            <div className={`absolute inset-0 grid place-content-center text-center ${INK}`}>
              <p className="text-[40px] leading-none">{value}%</p>
              <p className="text-base">Theo dõi<br />tiến trình</p>
              <p className="text-[11px] text-vp-muted">(số liệu minh họa)</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Gallery({ onOpenParentDashboard }) {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col lg:flex-row justify-between gap-6">
        <h2 className={`${H2} text-[#001a35] max-w-[572px]`}>Ba mẹ luôn biết bé đang tiến bộ thế nào</h2>
        <div className="flex items-start gap-6">
          <p className={`text-xl leading-[1.3] ${INK} max-w-[310px]`}>Từ những bài đã hoàn thành đến khả năng phát âm, Parent Dashboard giúp ba mẹ theo dõi hành trình học của bé một cách rõ ràng.</p>
          <img src={galleryThumb} alt="" className="hidden sm:block h-[140px] w-[160px] rounded-3xl object-cover" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[
          { img: gallery1, tag: "Tiến độ học", text: "Bé đã học gì và hoàn thành bao nhiêu bài." },
          { img: gallery2, tag: "Phát âm", text: "Những âm bé đã làm tốt và những âm cần luyện thêm.", offset: true }
        ].map((g) => (
          <div key={g.tag} className={`flex flex-col gap-6 ${g.offset ? "lg:mt-20" : ""}`}>
            <div className="relative">
              <img src={g.img} alt="" className="h-[260px] sm:h-[351px] w-full rounded-[20px] object-cover" />
              <span className="absolute top-6 right-6 rounded-[15px] bg-vp-blue px-8 py-2.5 text-base text-white">{g.tag}</span>
            </div>
            <button onClick={onOpenParentDashboard} className="self-start flex items-center gap-10 rounded-[20px] bg-white p-6 text-left">
              <span className={`max-w-[300px] text-2xl leading-[1.3] ${INK}`}>{g.text}</span>
              <ChevronRight className="w-5 h-5 shrink-0" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Principles() {
  const cards = [
    { img: demo2, title: "Không áp lực", body: "Không biến mỗi lần phát âm thành một bài kiểm tra.", cls: "lg:col-start-2" },
    { img: demo1, title: "Luôn được khuyến khích", body: "Feedback tập trung vào điều bé có thể cải thiện.", cls: "lg:col-start-1" },
    { img: demo3, title: "Tiến bộ từng chút", body: "Mỗi phiên học đều là một bước nhỏ trong hành trình đọc tốt hơn.", cls: "lg:col-start-2 lg:ml-20" }
  ];
  return (
    <section className="flex flex-col gap-10">
      <div className="flex flex-col-reverse lg:flex-row justify-between gap-6">
        <div className="max-w-[354px] flex flex-col gap-6 lg:mt-10">
          <p className={`text-xl leading-[1.3] ${INK}`}>VietPhonics AI tạo ra một không gian học tập thân thiện, nơi bé được thử, mắc lỗi và thử lại theo cách nhẹ nhàng.</p>
          <span className="border-t border-dashed border-slate-300" />
        </div>
        <h2 className={`${H2} lg:text-right max-w-[626px]`}>Học đọc không cần phải áp lực</h2>
      </div>
      <div className="rounded-[20px] bg-vp-sky p-6 sm:p-12 grid gap-6 lg:grid-cols-2">
        <p className={`font-heading text-[32px] font-bold ${INK} lg:col-start-1 lg:row-start-1`}>3 Nguyên Tắc</p>
        {cards.map((c) => (
          <div key={c.title} className={`rounded-3xl bg-white p-6 flex items-center gap-4 max-w-[461px] ${c.cls}`}>
            <img src={c.img} alt="" className="w-[123px] h-[117px] shrink-0 rounded-3xl object-cover" />
            <div className="flex-1 min-w-0 text-[#001a35]">
              <p className="text-xl font-medium">{c.title}</p>
              <p className="text-base leading-[1.3]">{c.body}</p>
            </div>
            <span className="hidden sm:grid w-[50px] h-[100px] shrink-0 rounded-3xl bg-vp-blue text-white place-items-center"><ChevronRight className="w-5 h-5" /></span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials({ onStartLearning }) {
  const quotes = [
    { img: testimonial1, text: "“Con gái tôi trước đây thường cảm thấy chán nản, nhưng giờ đây nó mong chờ thời gian học của mình”", by: "Chị Nguyễn Kim Dung" },
    { img: testimonial2, text: "“Con trai tôi thường bị thiếu tập trung lúc học, nhưng giờ đây em có thể tập trung một cách dễ dàng”", by: "Chị Phạm Quỳnh Loan" }
  ];
  return (
    <section className="flex flex-col gap-8">
      <h2 className={`font-heading font-medium leading-[1.3] ${INK} text-4xl sm:text-5xl lg:text-[70px] max-w-[846px]`}>An tâm để bé học, yên tâm để ba mẹ đồng hành</h2>
      <PillButton onClick={onStartLearning} className="self-start">Bắt đầu ngay</PillButton>
      <div className="grid gap-5 lg:grid-cols-2">
        {quotes.map((q) => (
          <figure key={q.by} className="rounded-[20px] bg-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 min-h-[256px]">
            <img src={q.img} alt={q.by} className="w-[100px] h-[100px] rounded-full object-cover shrink-0" />
            <div className="flex flex-col gap-4">
              <blockquote className={`text-xl leading-[1.3] ${INK}`}>{q.text}</blockquote>
              <span className="border-t border-dashed border-slate-300" />
              <figcaption className={`text-xs ${INK}`}>{q.by}</figcaption>
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const submit = (e) => {
    e.preventDefault();
    if (!name.trim() || phone.replace(/\D/g, "").length < 9) return setError("Vui lòng nhập tên và số điện thoại hợp lệ.");
    setError(null);
    setSent(true);
  };
  return (
    <footer className="border-t border-[#2e2e2e]/20 pt-14 pb-10 flex flex-col gap-16">
      <div className="grid gap-8 lg:grid-cols-[1fr_387px] items-center">
        <p className={`font-heading text-3xl sm:text-5xl font-medium leading-[1.3] ${INK}`}>Vietphonics AI đã biến việc học thành hoạt động yêu thích của trẻ!</p>
        <img src={footerPhoto} alt="Bé vui vẻ bên chồng sách" className="h-[186px] w-full rounded-3xl object-cover" />
      </div>
      <div className="grid gap-10 lg:grid-cols-3">
        <div className="flex flex-col gap-6">
          <p className={`text-base leading-[30px] ${INK} max-w-[310px]`}>Đồng hành cùng ba mẹ giúp bé đọc đúng, phát âm chuẩn tiếng Việt mỗi ngày.</p>
          <img src={socialIcons} alt="Facebook, Twitter, Instagram, LinkedIn, YouTube" className="self-start" />
        </div>
        <form onSubmit={submit} className="lg:col-span-2 grid gap-8 sm:grid-cols-2" data-testid="contact-form">
          <div className="flex flex-col gap-5">
            <label className={`flex flex-col gap-2 text-base ${INK}`}>Tên :
              <input value={name} onChange={(e) => setName(e.target.value)} className="border-b border-[#2e2e2e]/60 bg-transparent py-1 outline-none focus:border-vp-blue" />
            </label>
            <p className={`text-base leading-[26px] ${INK}`}>Chúng tôi rất muốn nghe từ bạn! Dù bạn có câu hỏi nào về bài học hay gói học của bé.</p>
          </div>
          <div className="flex flex-col gap-5">
            <label className={`flex flex-col gap-2 text-base ${INK}`}>Điện thoại :
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="border-b border-[#2e2e2e]/60 bg-transparent py-1 outline-none focus:border-vp-blue" />
            </label>
            {sent ? (
              <p className="rounded-3xl bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-700">Cảm ơn {name}! Tư vấn viên sẽ gọi lại cho bạn sớm (demo).</p>
            ) : (
              <button type="submit" className={`flex items-center justify-between rounded-3xl border border-[#2e2e2e] px-5 h-10 text-base ${INK} hover:bg-white`}>
                Liên hệ với chúng tôi <ArrowUpRight className="w-4 h-4" />
              </button>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        </form>
      </div>
      <p className="text-center text-xs text-vp-muted">© {new Date().getFullYear()} VietPhonics AI · Hotline {HOTLINE}</p>
    </footer>
  );
}

export default function LandingView({ onStartLearning, onOpenParentDashboard, onSignup }) {
  return (
    <div className="bg-vp-canvas">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-0 flex flex-col gap-24 lg:gap-36 pb-6">
        <Hero onStartLearning={onStartLearning} />
        <About onStartLearning={onStartLearning} onSignup={onSignup} />
        <Services onStartLearning={onStartLearning} />
        <ProgressSection onOpenParentDashboard={onOpenParentDashboard} />
        <Gallery onOpenParentDashboard={onOpenParentDashboard} />
        <Principles />
        <Testimonials onStartLearning={onStartLearning} />
        <Footer />
      </div>
    </div>
  );
}
