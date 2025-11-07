import { useState, useTransition } from "react";
import { useProfile, useCourses } from "../hooks/useApi";
import { getToken } from "../utils/authUtils";
import { useLanguage } from "../contexts/LanguageContext";
import { useQueryClient } from "@tanstack/react-query";
import Header from "./Header";
import "./AccountManagement.css";

interface AccountManagementProps {
  user: { username: string };
  onLogout: () => void;
  currentTab: "dashboard" | "assignments" | "account";
  onTabChange: (tab: "dashboard" | "assignments" | "account") => void;
}

export default function AccountManagement({
  user,
  onLogout,
  currentTab,
  onTabChange,
}: AccountManagementProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [canvasToken, setCanvasToken] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );

  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useProfile();

  const { data: coursesData, isLoading: coursesLoading } = useCourses();

  const showMessage = (msg: string, type: "success" | "error") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  const handleUpdateToken = async () => {
    if (!canvasToken.trim()) {
      showMessage(t("token_required"), "error");
      return;
    }

    startTransition(async () => {
      try {
        const token = getToken();
        const response = await fetch("http://localhost:5000/api/canvas-token", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ canvasToken: canvasToken.trim() }),
        });

        const data = await response.json();

        if (data.success) {
          showMessage(data.message || t("token_updated"), "success");
          setIsEditing(false);
          setCanvasToken("");
          refetchProfile();
        } else {
          showMessage(data.message || "Failed to update Canvas token", "error");
        }
      } catch (error) {
        showMessage(t("network_error"), "error");
      }
    });
  };

  const handleDeleteToken = async () => {
    if (!confirm(t("remove_token_confirm"))) {
      return;
    }

    startTransition(async () => {
      try {
        const token = getToken();
        const response = await fetch("http://localhost:5000/api/canvas-token", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (data.success) {
          showMessage(t("token_removed"), "success");
          refetchProfile();
        } else {
          showMessage(data.message || "Failed to remove Canvas token", "error");
        }
      } catch (error) {
        showMessage(t("network_error"), "error");
      }
    });
  };

  const handleSyncCanvas = async () => {
    startTransition(async () => {
      try {
        const token = getToken();
        const response = await fetch(
          "http://localhost:5000/api/courses/sync-canvas-assignments",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              "X-Client-Timezone":
                Intl.DateTimeFormat().resolvedOptions().timeZone,
              "X-Client-Timezone-Offset": new Date()
                .getTimezoneOffset()
                .toString(),
            },
          }
        );

        const data = await response.json();

        if (data.success) {
          // Invalidate all relevant queries to refresh data
          await queryClient.invalidateQueries({ queryKey: ["tasks"] });
          await queryClient.invalidateQueries({ queryKey: ["courses"] });
          showMessage(
            `Canvas synced: ${data.assignmentCount} assignments, ${
              data.moduleItemCount || 0
            } module items`,
            "success"
          );
        } else {
          showMessage(
            data.message || "Failed to sync Canvas assignments",
            "error"
          );
        }
      } catch (error) {
        showMessage(t("network_error"), "error");
      }
    });
  };

  const handleResetAndSync = async () => {
    if (
      !confirm(
        "This will delete ALL existing tasks and re-sync from Canvas. Are you sure?"
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const token = getToken();
        const response = await fetch(
          "http://localhost:5000/api/courses/reset-and-sync-canvas",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              "X-Client-Timezone":
                Intl.DateTimeFormat().resolvedOptions().timeZone,
              "X-Client-Timezone-Offset": new Date()
                .getTimezoneOffset()
                .toString(),
            },
          }
        );

        const data = await response.json();

        if (data.success) {
          // Invalidate all relevant queries to refresh data
          await queryClient.invalidateQueries({ queryKey: ["tasks"] });
          await queryClient.invalidateQueries({ queryKey: ["courses"] });
          showMessage(
            `Reset complete! ${data.courses} courses, ${
              data.assignments
            } assignments, ${data.moduleItems || 0} module items synced.`,
            "success"
          );
        } else {
          showMessage(data.message || "Failed to reset and sync", "error");
        }
      } catch (error) {
        showMessage(t("network_error"), "error");
      }
    });
  };

  if (profileLoading) {
    return (
      <div className="account-container">
        <div className="account-loading">
          <div className="loading-spinner"></div>
          <p>{t("loading_account")}</p>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="account-container">
        <div className="account-error">
          <p>Failed to load account information</p>
          <button
            onClick={() => onTabChange("dashboard")}
            className="back-button"
          >
            {t("back_to_dashboard")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="account-container">
      <Header
        user={user}
        onLogout={onLogout}
        currentTab={currentTab}
        onTabChange={onTabChange}
      />

      <main className="account-content">
        <div className="account-section">
          <h2>{t("profile_info")}</h2>
          <div className="profile-info">
            <div className="info-item">
              <label>{t("username")}:</label>
              <span>{profileData?.profile?.username}</span>
            </div>
            <div className="info-item">
              <label>{t("email")}:</label>
              <span>{profileData?.profile?.email}</span>
            </div>
            <div className="info-item">
              <label>{t("role")}:</label>
              <span className="role-badge">{profileData?.profile?.role}</span>
            </div>
            <div className="info-item">
              <label>{t("join_date")}:</label>
              <span>{profileData?.profile?.joinDate}</span>
            </div>
          </div>
        </div>

        <div className="account-section">
          <h2>{t("canvas_integration")}</h2>
          <p className="section-description">{t("canvas_desc")}</p>

          {message && <div className={`message ${messageType}`}>{message}</div>}

          <div className="canvas-token-section">
            <div className="token-status">
              <div
                className={`status-indicator ${
                  profileData?.profile?.hasCanvasToken
                    ? "connected"
                    : "disconnected"
                }`}
              >
                <div className="status-dot"></div>
                <span>
                  {profileData?.profile?.hasCanvasToken
                    ? t("connected")
                    : t("not_connected")}
                </span>
              </div>
              {profileData?.profile?.hasCanvasToken && (
                <div className="token-preview">
                  Token: {profileData?.profile?.canvasTokenPreview}
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="token-editor">
                <div className="form-group">
                  <label htmlFor="canvas-token">{t("canvas_token")}:</label>
                  <input
                    id="canvas-token"
                    type="password"
                    value={canvasToken}
                    onChange={(e) => setCanvasToken(e.target.value)}
                    placeholder="Enter your Canvas API token..."
                    className="token-input"
                    disabled={isPending}
                  />
                  <small className="help-text">
                    Get your API token from Canvas → Account → Settings →
                    Approved Integrations → New Access Token
                  </small>
                </div>
                <div className="token-actions">
                  <button
                    onClick={handleUpdateToken}
                    className="save-button"
                    disabled={isPending || !canvasToken.trim()}
                  >
                    {isPending ? t("saving") : t("save_token")}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setCanvasToken("");
                    }}
                    className="cancel-button"
                    disabled={isPending}
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="token-controls">
                <button
                  onClick={() => setIsEditing(true)}
                  className="edit-button"
                  disabled={isPending}
                >
                  {profileData?.profile?.hasCanvasToken
                    ? t("update_token")
                    : t("add_token")}
                </button>
                {profileData?.profile?.hasCanvasToken && (
                  <>
                    <button
                      onClick={handleSyncCanvas}
                      className="sync-button"
                      disabled={isPending}
                    >
                      {isPending ? "Syncing..." : "🔄 Sync Canvas"}
                    </button>
                    <button
                      onClick={handleResetAndSync}
                      className="reset-button"
                      disabled={isPending}
                    >
                      {isPending ? "Resetting..." : "🔄 Reset & Re-sync All"}
                    </button>
                    <button
                      onClick={handleDeleteToken}
                      className="delete-button"
                      disabled={isPending}
                    >
                      {isPending ? t("removing") : t("remove_token")}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="canvas-help">
            <h3>{t("canvas_help_title")}</h3>
            <ol>
              <li>{t("canvas_help_1")}</li>
              <li>{t("canvas_help_2")}</li>
              <li>{t("canvas_help_3")}</li>
              <li>{t("canvas_help_4")}</li>
              <li>{t("canvas_help_5")}</li>
              <li>{t("canvas_help_6")}</li>
            </ol>
            <p className="security-note">
              <strong>Security:</strong> {t("security_note")}
            </p>
          </div>
        </div>

        {/* Courses Section */}
        <div className="account-section">
          <h2>{t("Synced_section_title")}</h2>
          <p className="section-description">{t("Synced_section_desc")}</p>

          <div className="courses-list">
            {coursesLoading ? (
              <div className="loading">Loading courses...</div>
            ) : coursesData?.courses?.length > 0 ? (
              <div className="courses-grid">
                {coursesData.courses.map((course: any) => (
                  <div key={course.id} className="course-item">
                    <h4>{course.name}</h4>
                    {course.professor && course.professor !== "N/A" && (
                      <p className="course-code">
                        Course Code: {course.professor}
                      </p>
                    )}
                    {course.canvas_course_id && (
                      <div className="canvas-sync-badge">
                        <span>🎯</span> {t("Synced_from_Canvas")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-courses-account">
                <p>No courses found.</p>
                <p>
                  Add your Canvas API token above to sync your courses
                  automatically.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
