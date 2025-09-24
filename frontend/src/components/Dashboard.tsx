import { useState, useEffect } from 'react';
import { useHealthStatus, useCourses } from '../hooks/useApi';
import { useLanguage } from '../contexts/LanguageContext';
import LoadingScreen from './LoadingScreen';
import SettingsDropdown from './SettingsDropdown';
import './Dashboard.css';

interface DashboardProps {
  user: { username: string };
  onLogout: () => void;
  onNavigateToAccount: () => void;
}

export default function Dashboard({ user, onLogout, onNavigateToAccount }: DashboardProps) {
  const { t } = useLanguage();

  const {
    data: healthStatus,
    isLoading: healthLoading,
    error: healthError,
    refetch: refetchHealth
  } = useHealthStatus();

  const {
    data: coursesData,
    isLoading: coursesLoading,
    error: coursesError
  } = useCourses();

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

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>{t('dashboard')}</h1>
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
          <button onClick={onNavigateToAccount} className="account-button">
            {t('account')}
          </button>
          <button onClick={handleLogout} className="logout-button">
            {t('logout')}
          </button>
        </div>
      </header>

      <main className="dashboard-content">

        <div className="courses-section">
          <h2>{t('your_courses')}</h2>
          <div className="courses-grid">
            {coursesLoading ? (
              <div className="loading">{t('loading_courses')}</div>
            ) : coursesError ? (
              <div className="error">
                <p>Failed to load courses: {coursesError.message}</p>
              </div>
            ) : coursesData?.courses?.length > 0 ? (
              coursesData.courses.map((course: any) => (
                <div key={course.id} className="course-card">
                  <h3>{course.name}</h3>
                  <p><strong>{t('professor')}:</strong> {course.professor}</p>
                  <p><strong>{t('credits')}:</strong> {course.credits}</p>
                  <button className="course-button">{t('view_details')}</button>
                </div>
              ))
            ) : (
              <div className="no-courses">
                <p>{t('no_courses')}</p>
              </div>
            )}
          </div>
        </div>

        <div className="features-section">
          <h2>{t('available_features')}</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>{t('performance_analytics')}</h3>
              <p>{t('performance_analytics_desc')}</p>
              <button className="feature-button" disabled>{t('coming_soon')}</button>
            </div>
            <div className="feature-card">
              <h3>{t('task_scheduler')}</h3>
              <p>{t('task_scheduler_desc')}</p>
              <button className="feature-button" disabled>{t('coming_soon')}</button>
            </div>
            <div className="feature-card">
              <h3>{t('grade_tracker')}</h3>
              <p>{t('grade_tracker_desc')}</p>
              <button className="feature-button" disabled>{t('coming_soon')}</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}