import { useState, useEffect } from "react";
import { useProfile, useHealthStatus } from "../hooks/useApi";
import { useLanguage } from "../contexts/LanguageContext";
import SettingsDropdown from "./SettingsDropdown";
import LoadingScreen from "./LoadingScreen";
import "./AccountManagement.css";

interface AccountManagementProps {
  user: { username: string };
  onBack: () => void;
  onLogout: () => void;
}

export default function AccountManagement({
  user,
  onBack,
  onLogout,
}: AccountManagementProps) {
  const { t } = useLanguage();
  const [canvasToken, setCanvasToken] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const {
    data: healthStatus,
    isLoading: healthLoading,
    error: healthError,
  } = useHealthStatus();

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('dashboard_token');
      if (token) {
        await fetch('http://localhost:5000/api/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
      onLogout();
    } catch (err) {
      console.error('Logout error:', err);
      onLogout();
    }
  };

  const showMessage = (msg: string, type: "success" | "error") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  const handleUpdateToken = async () => {
    if (!canvasToken.trim()) {
      showMessage(t('token_required'), "error");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("dashboard_token");
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
        showMessage(t('token_updated'), "success");
        setIsEditing(false);
        setCanvasToken("");
        refetchProfile();
      } else {
        showMessage(data.message || "Failed to update Canvas token", "error");
      }
    } catch (error) {
      showMessage(t('network_error'), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteToken = async () => {
    if (
      !confirm(t('remove_token_confirm'))
    ) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("dashboard_token");
      const response = await fetch("http://localhost:5000/api/canvas-token", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        showMessage(t('token_removed'), "success");
        refetchProfile();
      } else {
        showMessage(data.message || "Failed to remove Canvas token", "error");
      }
    } catch (error) {
      showMessage(t('network_error'), "error");
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="account-container">
        <div className="account-loading">
          <div className="loading-spinner"></div>
          <p>{t('loading_account')}</p>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="account-container">
        <div className="account-error">
          <p>Failed to load account information</p>
          <button onClick={onBack} className="back-button">
            {t('back_to_dashboard')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="account-container">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>{t('account_management')}</h1>
          <div className="health-indicator">
            <div
              className={`health-dot ${healthStatus?.healthLevel || 'red'}`}
              title={healthStatus?.message || t('checking')}
            ></div>
            <span className="health-text">
              {healthLoading ? t('checking') :
               healthStatus?.healthLevel === 'green' ? t('online') :
               healthStatus?.healthLevel === 'yellow' ? t('warning') : t('offline')}
            </span>
          </div>
        </div>
        <div className="user-info">
          <span>{t('welcome')}, {user.username}!</span>
          <SettingsDropdown />
          <button onClick={onBack} className="account-button">
            ← {t('back_to_dashboard')}
          </button>
          <button onClick={handleLogout} className="logout-button">
            {t('logout')}
          </button>
        </div>
      </header>

      <main className="account-content">
        <div className="account-section">
          <h2>{t('profile_info')}</h2>
          <div className="profile-info">
            <div className="info-item">
              <label>{t('username')}:</label>
              <span>{profileData?.profile?.username}</span>
            </div>
            <div className="info-item">
              <label>{t('email')}:</label>
              <span>{profileData?.profile?.email}</span>
            </div>
            <div className="info-item">
              <label>{t('role')}:</label>
              <span className="role-badge">{profileData?.profile?.role}</span>
            </div>
            <div className="info-item">
              <label>{t('join_date')}:</label>
              <span>{profileData?.profile?.joinDate}</span>
            </div>
          </div>
        </div>

        <div className="account-section">
          <h2>{t('canvas_integration')}</h2>
          <p className="section-description">
            {t('canvas_desc')}
          </p>

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
                    ? t('connected')
                    : t('not_connected')}
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
                  <label htmlFor="canvas-token">{t('canvas_token')}:</label>
                  <input
                    id="canvas-token"
                    type="password"
                    value={canvasToken}
                    onChange={(e) => setCanvasToken(e.target.value)}
                    placeholder="Enter your Canvas API token..."
                    className="token-input"
                    disabled={loading}
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
                    disabled={loading || !canvasToken.trim()}
                  >
                    {loading ? t('saving') : t('save_token')}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setCanvasToken("");
                    }}
                    className="cancel-button"
                    disabled={loading}
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="token-controls">
                <button
                  onClick={() => setIsEditing(true)}
                  className="edit-button"
                  disabled={loading}
                >
                  {profileData?.profile?.hasCanvasToken
                    ? t('update_token')
                    : t('add_token')}
                </button>
                {profileData?.profile?.hasCanvasToken && (
                  <button
                    onClick={handleDeleteToken}
                    className="delete-button"
                    disabled={loading}
                  >
                    {loading ? t('removing') : t('remove_token')}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="canvas-help">
            <h3>{t('canvas_help_title')}</h3>
            <ol>
              <li>{t('canvas_help_1')}</li>
              <li>{t('canvas_help_2')}</li>
              <li>{t('canvas_help_3')}</li>
              <li>{t('canvas_help_4')}</li>
              <li>{t('canvas_help_5')}</li>
              <li>{t('canvas_help_6')}</li>
            </ol>
            <p className="security-note">
              <strong>Security:</strong> {t('security_note')}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
