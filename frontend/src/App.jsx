import React, { lazy, Suspense, useState, useEffect } from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import LandingView from "./views/LandingView";
import ProfileSelectView from "./views/ProfileSelectView";
import KidDashboardView from "./views/KidDashboardView";
import LessonCatalogView from "./views/LessonCatalogView";
import PracticeStudioView from "./views/PracticeStudioView";
import AIResultModal from "./views/AIResultModal";
import KidProgressView from "./views/KidProgressView";
import ParentDashboardView from "./views/ParentDashboardView";
import SubscriptionView from "./views/SubscriptionView";
import RewardsView from "./views/RewardsView";
import ParentProgressView from "./views/parent/ParentProgressView";
import ParentPronunciationView from "./views/parent/ParentPronunciationView";
import ChildProfileView from "./views/parent/ChildProfileView";
import PrivacyConsentView from "./views/parent/PrivacyConsentView";
import LoginView from "./views/auth/LoginView";
import SignupView from "./views/auth/SignupView";
import ForgotPasswordView from "./views/auth/ForgotPasswordView";
import AppShell from "./components/shell/AppShell";
import { PublicTopBar } from "./components/shell/TopBar";
import { Modal, Button } from "./components/ui";
import { SHELL_VIEWS, ROLE_HOME, VIEW_ROLE } from "./components/shell/navConfig";
import { playSoundEffect } from "./services/audioService";
import { recordPracticeSession } from "./services/apiService";
import { useStore } from "./services/store";
import ChangePasswordView from "./views/auth/ChangePasswordView";

// Admin screens are only used by admins: load them on demand to keep the child/parent bundle small.
const AdminDashboardView = lazy(() => import("./views/admin/AdminDashboardView"));
const AdminLessonsView = lazy(() => import("./views/admin/AdminLessonsView"));
const AdminContentView = lazy(() => import("./views/admin/AdminContentView"));
const AdminPricingView = lazy(() => import("./views/admin/AdminPricingView"));
const AdminPromotionsView = lazy(() => import("./views/admin/AdminPromotionsView"));
const AdminUsersView = lazy(() => import("./views/admin/AdminUsersView"));
const AdminOrdersView = lazy(() => import("./views/admin/AdminOrdersView"));
const AdminRevenueView = lazy(() => import("./views/admin/AdminRevenueView"));
const AdminAnalyticsView = lazy(() => import("./views/admin/AdminAnalyticsView"));
const AdminRewardsView = lazy(() => import("./views/admin/AdminRewardsView"));
const AdminSettingsView = lazy(() => import("./views/admin/AdminSettingsView"));

export default function App() {
  const store = useStore();
  const { booting, user, auth, kids: profiles, catalog, getChildSettings } = store;

  const [currentView, setCurrentView] = useState("landing");
  const [pendingView, setPendingView] = useState(null);
  const [loginNotice, setLoginNotice] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("all");
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [currentLessonId, setCurrentLessonId] = useState(null);
  const [aiModalState, setAiModalState] = useState({ isOpen: false, word: null, result: null, onRetry: () => {}, onNext: () => {} });

  const selectedChild = profiles.find((p) => p.id === selectedChildId) || profiles[0];
  const lessons = catalog.lessons;
  const currentLesson = lessons.find((l) => l.id === currentLessonId) || lessons[0];
  const aiEnabled = getChildSettings(selectedChild?.id).consentAnalysis;

  // Kid, parent and admin areas need a signed-in account of the right kind; the login page says which one
  // and returns the user to the requested screen afterwards.
  const loginRequirement = (view) => {
    const area = VIEW_ROLE[view];
    if (area === "admin" && user?.role !== "admin") {
      return user
        ? "Tài khoản hiện tại không có quyền quản trị. Vui lòng đăng nhập bằng tài khoản Admin."
        : "Khu vực Admin cần đăng nhập bằng tài khoản Admin. Vui lòng đăng nhập để tiếp tục.";
    }
    if (area === "parent" || area === "kid") {
      if (!user) return "Ba mẹ cần đăng nhập (hoặc đăng ký) để bé học và để xem dữ liệu của bé.";
      if (user.role === "admin") return "Khu vực này dành cho tài khoản Phụ huynh. Vui lòng đăng nhập bằng tài khoản Phụ huynh.";
    }
    return null;
  };

  const navigate = (view) => {
    if (user?.mustChangePassword && view !== "change_password" && view !== "landing") {
      setCurrentView("change_password");
      return;
    }
    const requirement = loginRequirement(view);
    if (requirement) {
      setPendingView(view);
      setLoginNotice(requirement);
      setCurrentView("login");
      window.scrollTo?.(0, 0);
      return;
    }
    if (view !== "login") setLoginNotice(null);
    if (!["login", "signup", "forgot"].includes(view)) setPendingView(null);
    setAiModalState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
    setCurrentView(view);
    window.scrollTo?.(0, 0);
  };

  const authNav = {
    home: () => navigate("landing"),
    login: () => navigate("login"),
    signup: () => navigate("signup"),
    forgot: () => navigate("forgot")
  };

  const handleLoggedIn = (account) => {
    playSoundEffect("success");
    setPendingView(null);
    setLoginNotice(null);
    setSelectedChildId(null);
    if (account.mustChangePassword) {
      setCurrentView("change_password");
      return;
    }
    const allowed = pendingView && (VIEW_ROLE[pendingView] === "admin" ? account.role === "admin" : account.role !== "admin");
    setCurrentView(allowed ? pendingView : account.role === "admin" ? "admin_dashboard" : "parent_dashboard");
  };

  const handleLogout = async () => {
    setAccountOpen(false);
    await auth.logout();
    setSelectedChildId(null);
    setCurrentView("landing");
  };

  // The session ended on the server (expired or the account was locked): back to the login page.
  useEffect(() => {
    if (!store.expired) return;
    store.clearExpired();
    if (currentView !== "landing") {
      setLoginNotice("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      setCurrentView("login");
    }
  }, [store, currentView]);

  // The lesson list is the admin's: fetch it again when a learning screen opens so new lessons show up.
  useEffect(() => {
    if (["kid_dashboard", "lesson_catalog", "practice", "kid_progress", "rewards"].includes(currentView)) store.reloadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  const addChild = async (body) => {
    const result = await store.addChild(body);
    if (result.ok) setSelectedChildId(result.child.id);
    return result;
  };

  const handleRegistered = async (childBody) => {
    if (childBody) await addChild(childBody);
    navigate("kid_dashboard");
  };

  const handleStartLesson = (lessonId, category = "all") => {
    playSoundEffect("click");
    setCurrentLessonId(lessonId);
    setActiveCategoryFilter(category);
    navigate("practice");
  };

  const handleOpenExerciseResult = ({ word, result, recording, onNextWord, onRetry }) => {
    const childId = selectedChild.id;
    setAiModalState({
      isOpen: true,
      word,
      result,
      recording,
      awarded: null,
      onRetry: () => {
        setAiModalState((prev) => ({ ...prev, isOpen: false }));
        onRetry();
      },
      onNext: () => {
        setAiModalState((prev) => ({ ...prev, isOpen: false }));
        onNextWord();
      }
    });
    // The server holds the score (by attempt id) and decides whether points are awarded.
    if (!result.attempt_id) return;
    recordPracticeSession(childId, result.attempt_id)
      .then((saved) => {
        store.applyChild(saved.updated_child);
        setAiModalState((prev) => (prev.result === result ? { ...prev, awarded: saved.stars_awarded } : prev));
      })
      .catch((err) => console.warn("Chưa lưu được kết quả luyện tập:", err));
  };

  const parentProps = { profiles, selectedChild, onSelectChild: (c) => c && setSelectedChildId(c.id) };

  const renderShellView = () => {
    switch (currentView) {
      case "profile_select":
        return (
          <ProfileSelectView
            profiles={profiles}
            selectedChild={selectedChild}
            onSelectChild={(child) => { setSelectedChildId(child.id); navigate("kid_dashboard"); }}
            onAddNewChild={async (body) => {
              const result = await addChild(body);
              if (result.ok) navigate("kid_dashboard");
              return result;
            }}
          />
        );
      case "kid_dashboard":
        return (
          <KidDashboardView
            selectedChild={selectedChild}
            onStartLesson={handleStartLesson}
            onViewAllLessons={() => navigate("lesson_catalog")}
            onViewRewards={() => navigate("rewards")}
          />
        );
      case "rewards":
        return <RewardsView selectedChild={selectedChild} onProfileChange={store.applyChild} />;
      case "lesson_catalog":
        return <LessonCatalogView initialCategory={activeCategoryFilter} selectedChild={selectedChild} onSelectLesson={handleStartLesson} />;
      case "practice":
        return (
          <>
            {aiModalState.isOpen && (
              <AIResultModal
                isOpen
                word={aiModalState.word}
                result={aiModalState.result}
                recording={aiModalState.recording}
                awarded={aiModalState.awarded}
                sensitivity={getChildSettings(selectedChild?.id).sensitivity}
                onRetry={aiModalState.onRetry}
                onNext={aiModalState.onNext}
              />
            )}
            <div hidden={aiModalState.isOpen}>
              <PracticeStudioView
                key={currentLesson?.id}
                lesson={currentLesson}
                aiEnabled={aiEnabled}
                childId={selectedChild?.id}
                onBack={() => navigate("kid_dashboard")}
                onFinishExercise={handleOpenExerciseResult}
              />
            </div>
          </>
        );
      case "kid_progress":
        return <KidProgressView selectedChild={selectedChild} onGoToLesson={(id) => handleStartLesson(id)} />;
      case "parent_dashboard":
        return <ParentDashboardView {...parentProps} onPracticeLesson={(id) => handleStartLesson(id)} />;
      case "parent_progress":
        return <ParentProgressView {...parentProps} />;
      case "parent_pronunciation":
        return <ParentPronunciationView {...parentProps} />;
      case "parent_child_profile":
        return (
          <ChildProfileView
            {...parentProps}
            onUpdateChild={(c) => store.updateChild(c.id, { name: c.name, age: c.age })}
            onDeleteChild={async (id) => {
              const result = await store.deleteChild(id);
              if (result.ok) setSelectedChildId(null);
              return result;
            }}
          />
        );
      case "parent_privacy":
        return <PrivacyConsentView {...parentProps} />;
      case "subscription":
        return <SubscriptionView onRequireLogin={() => navigate("login")} />;
      case "admin_dashboard":
        return <AdminDashboardView />;
      case "admin_lessons":
        return <AdminLessonsView />;
      case "admin_content":
        return <AdminContentView />;
      case "admin_rewards":
        return <AdminRewardsView />;
      case "admin_users":
        return <AdminUsersView />;
      case "admin_pricing":
        return <AdminPricingView />;
      case "admin_promotions":
        return <AdminPromotionsView />;
      case "admin_orders":
        return <AdminOrdersView />;
      case "admin_revenue":
        return <AdminRevenueView />;
      case "admin_analytics":
        return <AdminAnalyticsView />;
      case "admin_settings":
        return <AdminSettingsView />;
      default:
        return null;
    }
  };

  const renderPage = () => {
    if (booting) return <div className="min-h-screen grid place-items-center bg-white font-vp text-vp-muted" data-testid="boot">Đang tải…</div>;
    if (currentView === "login") return <LoginView nav={authNav} notice={loginNotice} onLoggedIn={handleLoggedIn} />;
    if (currentView === "signup") return <SignupView nav={authNav} onRegistered={handleRegistered} />;
    if (currentView === "forgot") return <ForgotPasswordView nav={authNav} onLoggedIn={handleLoggedIn} />;
    if (currentView === "change_password") return <ChangePasswordView nav={authNav} onDone={() => { setCurrentView(user?.role === "admin" ? "admin_dashboard" : "parent_dashboard"); }} />;
    if (SHELL_VIEWS.has(currentView)) {
      return (
        <AppShell
          currentView={currentView}
          onNavigate={navigate}
          onSwitchRole={(role) => { playSoundEffect("click"); navigate(ROLE_HOME[role]); }}
          onGoHome={() => navigate("landing")}
          onOpenAccount={() => (user ? setAccountOpen(true) : navigate("login"))}
          selectedChild={selectedChild}
        >
          <Suspense fallback={<p className="text-vp-muted" data-testid="view-loading">Đang tải…</p>}>{renderShellView()}</Suspense>
        </AppShell>
      );
    }
    return (
      <div className="min-h-screen bg-white font-vp">
        <PublicTopBar user={user} onGoHome={() => navigate("landing")} onLogin={authNav.login} onSignup={authNav.signup} onOpenAccount={() => setAccountOpen(true)} />
        <LandingView
          onStartLearning={() => { playSoundEffect("click"); navigate("profile_select"); }}
          onOpenParentDashboard={() => navigate("parent_dashboard")}
          onSignup={authNav.signup}
        />
      </div>
    );
  };

  return (
    <>
      {renderPage()}
      <Modal open={accountOpen && Boolean(user)} onClose={() => setAccountOpen(false)} title="Tài khoản của bạn"
        footer={<><Button variant="ghost" onClick={() => setAccountOpen(false)}>Đóng</Button><Button data-testid="logout" variant="danger" onClick={handleLogout}><LogOut className="w-4 h-4" /> Đăng xuất</Button></>}
      >
        {user && (
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-vp-blue text-white grid place-items-center"><UserIcon className="w-6 h-6" /></span>
            <div>
              <p className="font-bold text-vp-ink" data-testid="account-name">{user.name}</p>
              <p className="text-sm text-vp-muted">{user.email} • {user.role === "admin" ? "Quản trị viên" : "Phụ huynh"}</p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
