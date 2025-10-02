import { useHealthStatus } from "../hooks/useApi";
import { useLanguage } from "../contexts/LanguageContext";
import SettingsDropdown from "./SettingsDropdown";
import "./Header.css";

interface HeaderProps {
  user: { username: string };
  onLogout: () => void;
  currentTab: "dashboard" | "assignments" | "account";
  onTabChange: (tab: "dashboard" | "assignments" | "account") => void;
}

export default function Header({
  user,
  onLogout,
  currentTab,
  onTabChange,
}: HeaderProps) {
  const { t } = useLanguage();

  const { data: healthStatus, isLoading: healthLoading } = useHealthStatus();

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("dashboard_token");
      if (token) {
        await fetch("http://localhost:5000/api/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      }
      onLogout();
    } catch (err) {
      console.error("Logout error:", err);
      onLogout();
    }
  };

  return (
    <header className="nav-header">
      <div className="header-left">
        <h1 className="app-title">Dashboard</h1>
        <div className="health-indicator">
          <div
            className={`health-dot ${healthStatus?.healthLevel || "red"}`}
            title={healthStatus?.message || t("checking")}
          ></div>
          <span className="health-text">
            {healthLoading
              ? t("checking")
              : healthStatus?.healthLevel === "green"
              ? t("online")
              : healthStatus?.healthLevel === "yellow"
              ? t("warning")
              : t("offline")}
          </span>
        </div>
      </div>

      <nav className="nav-tabs">
        <button
          className={`nav-tab ${currentTab === "dashboard" ? "active" : ""}`}
          onClick={() => onTabChange("dashboard")}
        >
          🏠 {t("dashboard") || "Dashboard"}
        </button>
        <button
          className={`nav-tab ${currentTab === "assignments" ? "active" : ""}`}
          onClick={() => onTabChange("assignments")}
        >
          📋 {t("assignments") || "Assignments"}
        </button>
        <button
          className={`nav-tab ${currentTab === "account" ? "active" : ""}`}
          onClick={() => onTabChange("account")}
        >
          📜 {t("account") || "Account"}
        </button>
      </nav>

      <div className="header-right">
        <span className="welcome-text">
          {t("welcome")}, {user.username}!
        </span>
        <SettingsDropdown />
        <button onClick={handleLogout} className="header-button logout-button">
          {t("logout")}
        </button>
      </div>
    </header>
  );
}
