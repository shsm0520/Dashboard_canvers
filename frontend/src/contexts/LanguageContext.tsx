import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

type Language = "en" | "ko";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

// Translation dictionaries
const translations = {
  en: {
    // Header
    dashboard: "Dashboard",
    welcome: "Welcome",
    account: "Account",
    logout: "Logout",
    assignments: "Assignments",

    // Loading
    loading: "Loading...",
    initializing: "Initializing Dashboard...",
    authenticating: "Verifying authentication...",
    loading_data: "Loading your data...",
    loading_account: "Loading account information...",
    loading_dashboard: "Loading dashboard data...",

    // Health Status
    online: "Online",
    offline: "Offline",
    warning: "Warning",
    checking: "Checking...",
    refresh_status: "Refresh Status",
    refreshing: "Refreshing...",

    // Courses
    your_courses: "Your Courses",
    loading_courses: "Loading courses...",
    no_courses: "No courses enrolled yet.",
    view_details: "View Details",
    professor: "Professor",
    credits: "Credits",

    // Features
    available_features: "Available Features",
    coming_soon: "Coming Soon",
    performance_analytics: "Performance Analytics",
    performance_analytics_desc: "View academic performance trends and insights",
    task_scheduler: "Task Scheduler",
    task_scheduler_desc: "Organize and prioritize your academic tasks",
    grade_tracker: "Grade Tracker",
    grade_tracker_desc: "Monitor your grades and academic progress",

    // Account Management
    account_management: "Account Management",
    back_to_dashboard: "Back to Dashboard",
    profile_info: "Profile Information",
    username: "Username",
    email: "Email",
    role: "Role",
    join_date: "Join Date",

    // Canvas Integration
    canvas_integration: "Canvas Integration",
    canvas_desc:
      "Connect your Canvas account to sync courses, assignments, and grades automatically.",
    connected: "Connected",
    not_connected: "Not Connected",
    add_token: "Add Token",
    update_token: "Update Token",
    remove_token: "Remove Token",
    removing: "Removing...",
    canvas_token: "Canvas API Token",
    save_token: "Save Token",
    saving: "Saving...",
    cancel: "Cancel",
    token_updated: "Canvas API token updated successfully!",
    token_removed: "Canvas API token removed successfully",
    token_required: "Please enter a Canvas API token",
    token_invalid: "Canvas token appears to be invalid (too short)",
    network_error: "Network error. Please try again.",
    remove_token_confirm:
      "Are you sure you want to remove your Canvas API token? This will disable Canvas integration.",

    // Canvas Help
    canvas_help_title: "How to get your Canvas API Token:",
    canvas_help_1: "Log into your Canvas account",
    canvas_help_2: "Go to Account → Settings",
    canvas_help_3: 'Scroll down to "Approved Integrations"',
    canvas_help_4: 'Click "+ New Access Token"',
    canvas_help_5: 'Give it a purpose (e.g., "Dashboard Integration")',
    canvas_help_6: "Copy the generated token and paste it above",
    security_note:
      "Your token is stored securely and only used to access your Canvas data.",
    Synced_from_Canvas: "Synced from Canvas",
    Synced_section_desc:
      "These are your courses synced from Canvas. Courses are automatically updated when you log in.",
    Synced_section_title: "Enrolled Courses",
    // Calendar
    weekly_schedule: "Weekly Schedule",
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",

    // Login
    dashboard_login: "Dashboard Login",
    login: "Login",
    logging_in: "Logging in...",
    password: "Password",
    demo_credentials: "Demo Credentials:",
    login_failed: "Login failed",
    invalid_credentials: "Invalid username or password",

    // Assignments Page
    overdue: "Overdue",
    pending: "Pending",
    completed: "Completed",
    overdue_assignments: "Overdue Assignments",
    upcoming_assignments: "Upcoming Assignments",
    no_upcoming_assignments: "No upcoming assignments",
    completed_assignments: "Completed Assignments",
    no_completed_assignments: "No completed assignments",
    no_assignments: "No assignments",
    view_all: "View All",
    today: "Today",
    tomorrow: "Tomorrow",
    yesterday: "Yesterday",

    // Weekly Calendar
    week: "Week",
    current: "Current",
    type: "Type",
    priority: "Priority",
    course: "Course",
    time: "Time",
    date: "Date",
    status: "Status",
    description: "Description",
    mark_pending: "Mark as Pending",
    mark_completed: "Mark as Completed",
    close: "Close",

    // Settings
    theme: "Theme",
    light_mode: "Light Mode",
    dark_mode: "Dark Mode",
    language: "Language",
    english: "English",
    korean: "한국어",
  },
  ko: {
    // Header
    dashboard: "대시보드",
    welcome: "환영합니다",
    account: "계정",
    logout: "로그아웃",
    assignments: "과제",

    // Loading
    loading: "로딩 중...",
    initializing: "대시보드 초기화 중...",
    authenticating: "인증 확인 중...",
    loading_data: "데이터 로딩 중...",
    loading_account: "계정 정보 로딩 중...",
    loading_dashboard: "대시보드 데이터 로딩 중...",

    // Health Status
    online: "온라인",
    offline: "오프라인",
    warning: "경고",
    checking: "확인 중...",
    refresh_status: "상태 새로고침",
    refreshing: "새로고침 중...",

    // Courses
    your_courses: "내 수업",
    loading_courses: "수업 로딩 중...",
    no_courses: "등록된 수업이 없습니다.",
    view_details: "상세 보기",
    professor: "교수",
    credits: "학점",

    // Features
    available_features: "사용 가능한 기능",
    coming_soon: "곧 출시",
    performance_analytics: "성과 분석",
    performance_analytics_desc: "학업 성과 동향과 인사이트를 확인하세요",
    task_scheduler: "작업 스케줄러",
    task_scheduler_desc: "학업 작업을 정리하고 우선순위를 정하세요",
    grade_tracker: "성적 추적기",
    grade_tracker_desc: "성적과 학업 진도를 모니터링하세요",

    // Account Management
    account_management: "계정 관리",
    back_to_dashboard: "대시보드로 돌아가기",
    profile_info: "프로필 정보",
    username: "사용자명",
    email: "이메일",
    role: "역할",
    join_date: "가입일",

    // Canvas Integration
    canvas_integration: "Canvas 연동",
    canvas_desc:
      "Canvas 계정을 연결하여 수업, 과제, 성적을 자동으로 동기화하세요.",
    connected: "연결됨",
    not_connected: "연결되지 않음",
    add_token: "토큰 추가",
    update_token: "토큰 업데이트",
    remove_token: "토큰 제거",
    removing: "제거 중...",
    canvas_token: "Canvas API 토큰",
    save_token: "토큰 저장",
    saving: "저장 중...",
    cancel: "취소",
    token_updated: "Canvas API 토큰이 성공적으로 업데이트되었습니다!",
    token_removed: "Canvas API 토큰이 성공적으로 제거되었습니다",
    token_required: "Canvas API 토큰을 입력해주세요",
    token_invalid: "Canvas 토큰이 유효하지 않은 것 같습니다 (너무 짧음)",
    network_error: "네트워크 오류입니다. 다시 시도해주세요.",
    remove_token_confirm:
      "Canvas API 토큰을 제거하시겠습니까? Canvas 연동이 비활성화됩니다.",
    Synced_from_Canvas: "Canvas에서 동기화됨",
    Synced_section_desc:
      "Canvas에서 동기화된 수업입니다. 수업은 로그인할 때 자동으로 업데이트됩니다.",
    Synced_section_title: "등록된 수업",
    // Canvas Help
    canvas_help_title: "Canvas API 토큰을 얻는 방법:",
    canvas_help_1: "Canvas 계정에 로그인",
    canvas_help_2: "계정 → 설정으로 이동",
    canvas_help_3: '"승인된 통합"까지 스크롤',
    canvas_help_4: '"+ 새 액세스 토큰" 클릭',
    canvas_help_5: '용도를 입력 (예: "대시보드 연동")',
    canvas_help_6: "생성된 토큰을 복사해서 위에 붙여넣기",
    security_note:
      "토큰은 안전하게 저장되며 Canvas 데이터 접근에만 사용됩니다.",

    // Calendar
    weekly_schedule: "주간 일정",
    monday: "월",
    tuesday: "화",
    wednesday: "수",
    thursday: "목",
    friday: "금",
    saturday: "토",
    sunday: "일",

    // Login
    dashboard_login: "대시보드 로그인",
    login: "로그인",
    logging_in: "로그인 중...",
    password: "비밀번호",
    demo_credentials: "데모 계정:",
    login_failed: "로그인 실패",
    invalid_credentials: "잘못된 사용자명 또는 비밀번호",

    // Assignments Page
    overdue: "마감 지남",
    pending: "진행 중",
    completed: "완료됨",
    overdue_assignments: "마감 지난 과제",
    upcoming_assignments: "다가오는 과제",
    no_upcoming_assignments: "다가오는 과제가 없습니다",
    completed_assignments: "완료된 과제",
    no_completed_assignments: "완료된 과제가 없습니다",
    no_assignments: "과제가 없습니다",
    view_all: "전체 보기",
    today: "오늘",
    tomorrow: "내일",
    yesterday: "어제",

    // Weekly Calendar
    week: "주차",
    current: "현재",
    type: "유형",
    priority: "우선순위",
    course: "과목",
    time: "시간",
    date: "날짜",
    status: "상태",
    description: "설명",
    mark_pending: "진행 중으로 표시",
    mark_completed: "완료로 표시",
    close: "닫기",

    // Settings
    theme: "테마",
    light_mode: "라이트 모드",
    dark_mode: "다크 모드",
    language: "언어",
    english: "English",
    korean: "한국어",
  },
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    // Check for saved language preference or default to browser language
    const savedLanguage = localStorage.getItem(
      "dashboard_language"
    ) as Language;
    const browserLanguage = navigator.language.toLowerCase();

    const initialLanguage =
      savedLanguage || (browserLanguage.includes("ko") ? "ko" : "en");

    setLanguage(initialLanguage);
  }, []);

  const handleSetLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    localStorage.setItem("dashboard_language", newLanguage);
  };

  const t = (key: string): string => {
    return (
      translations[language][key as keyof (typeof translations)["en"]] || key
    );
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
