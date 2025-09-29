import React from "react";
import { useTasks, updateTaskAPI } from "../hooks/useApi";
import { useCourseColors } from "../hooks/useCourseColors";
import { useLanguage } from "../contexts/LanguageContext";
import { useQueryClient } from "@tanstack/react-query";
import { formatDateLocal } from "../utils/dateUtils";
import Header from "./Header";
import "./Assignments.css";

interface AssignmentsProps {
  user: { username: string };
  onLogout: () => void;
  currentTab: 'dashboard' | 'assignments' | 'account';
  onTabChange: (tab: 'dashboard' | 'assignments' | 'account') => void;
}

export default function Assignments({
  user,
  onLogout,
  currentTab,
  onTabChange,
}: AssignmentsProps) {
  const { t } = useLanguage();
  const { getCourseColor } = useCourseColors();
  const queryClient = useQueryClient();

  // Get tasks from 1 month ago to 2 months from now for comprehensive view
  const today = new Date();
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setMonth(today.getMonth() - 1);
  const twoMonthsFromNow = new Date(today);
  twoMonthsFromNow.setMonth(today.getMonth() + 2);

  const {
    data: tasksData,
    isLoading: tasksLoading,
    error: tasksError,
  } = useTasks(
    formatDateLocal(oneMonthAgo),
    formatDateLocal(twoMonthsFromNow)
  );

  const handleToggleComplete = async (taskId: number, completed: boolean) => {
    try {
      await updateTaskAPI(taskId, { completed: !completed });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const groupTasksByStatus = () => {
    if (!tasksData?.tasks) return { pending: [], completed: [], overdue: [] };

    const now = new Date();
    const pending: any[] = [];
    const completed: any[] = [];
    const overdue: any[] = [];

    tasksData.tasks.forEach((task: any) => {
      const dueDate = new Date(task.due_date);

      if (task.completed) {
        completed.push(task);
      } else if (dueDate < now) {
        overdue.push(task);
      } else {
        pending.push(task);
      }
    });

    return {
      pending: pending.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
      overdue: overdue.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
      completed: completed.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()),
    };
  };

  const formatDueDate = (dateStr: string, timeStr?: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    let dateText = '';
    if (date.toDateString() === today.toDateString()) {
      dateText = t("today") || "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      dateText = t("tomorrow") || "Tomorrow";
    } else {
      dateText = date.toLocaleDateString();
    }

    return timeStr ? `${dateText} ${timeStr}` : dateText;
  };

  if (tasksLoading) {
    return (
      <div className="assignments-container">
        <Header
          user={user}
          onLogout={onLogout}
          currentTab={currentTab}
          onTabChange={onTabChange}
        />
        <main className="assignments-content">
          <div className="assignments-loading">
            <div className="loading-spinner"></div>
            <p>{t("loading") || "Loading assignments..."}</p>
          </div>
        </main>
      </div>
    );
  }

  if (tasksError) {
    return (
      <div className="assignments-container">
        <Header
          user={user}
          onLogout={onLogout}
          currentTab={currentTab}
          onTabChange={onTabChange}
        />
        <main className="assignments-content">
          <div className="assignments-error">
            <p>Failed to load assignments</p>
          </div>
        </main>
      </div>
    );
  }

  const { pending, overdue, completed } = groupTasksByStatus();

  return (
    <div className="assignments-container">
      <Header
        user={user}
        onLogout={onLogout}
        currentTab={currentTab}
        onTabChange={onTabChange}
      />

      <main className="assignments-content">
        <div className="assignments-header">
          <h1>{t("assignments") || "Assignments"}</h1>
          <div className="assignments-stats">
            <div className="stat overdue">
              <span className="stat-number">{overdue.length}</span>
              <span className="stat-label">{t("overdue") || "Overdue"}</span>
            </div>
            <div className="stat pending">
              <span className="stat-number">{pending.length}</span>
              <span className="stat-label">{t("pending") || "Pending"}</span>
            </div>
            <div className="stat completed">
              <span className="stat-number">{completed.length}</span>
              <span className="stat-label">{t("completed") || "Completed"}</span>
            </div>
          </div>
        </div>

        <div className="assignments-sections">
          {/* Overdue Assignments */}
          {overdue.length > 0 && (
            <section className="assignment-section overdue-section">
              <h2>⚠️ {t("overdue_assignments") || "Overdue Assignments"} ({overdue.length})</h2>
              <div className="assignments-grid">
                {overdue.map((task: any) => (
                  <div
                    key={task.id}
                    className="assignment-card overdue"
                    style={{ borderLeftColor: task.course ? getCourseColor(task.course) : '#ef4444' }}
                  >
                    <div className="assignment-header">
                      <h3>{task.title}</h3>
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleComplete(task.id, task.completed)}
                        className="assignment-checkbox"
                      />
                    </div>
                    {task.course && (
                      <div
                        className="assignment-course"
                        style={{
                          backgroundColor: getCourseColor(task.course),
                          color: 'white'
                        }}
                      >
                        {task.course}
                      </div>
                    )}
                    <div className="assignment-due overdue-date">
                      📅 {formatDueDate(task.due_date, task.due_time)}
                    </div>
                    <span className={`assignment-priority ${task.priority}`}>
                      {task.priority} priority
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Pending Assignments */}
          <section className="assignment-section pending-section">
            <h2>📋 {t("upcoming_assignments") || "Upcoming Assignments"} ({pending.length})</h2>
            <div className="assignments-grid">
              {pending.length > 0 ? pending.map((task: any) => (
                <div
                  key={task.id}
                  className="assignment-card pending"
                  style={{ borderLeftColor: task.course ? getCourseColor(task.course) : '#6b7280' }}
                >
                  <div className="assignment-header">
                    <h3>{task.title}</h3>
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleComplete(task.id, task.completed)}
                      className="assignment-checkbox"
                    />
                  </div>
                  {task.course && (
                    <div
                      className="assignment-course"
                      style={{
                        backgroundColor: getCourseColor(task.course),
                        color: 'white'
                      }}
                    >
                      {task.course}
                    </div>
                  )}
                  <div className="assignment-due">
                    📅 {formatDueDate(task.due_date, task.due_time)}
                  </div>
                  <span className={`assignment-priority ${task.priority}`}>
                    {task.priority} priority
                  </span>
                </div>
              )) : (
                <div className="no-assignments">
                  <p>{t("no_upcoming_assignments") || "No upcoming assignments"}</p>
                </div>
              )}
            </div>
          </section>

          {/* Completed Assignments */}
          <section className="assignment-section completed-section">
            <h2>✅ {t("completed_assignments") || "Completed Assignments"} ({completed.length})</h2>
            <div className="assignments-grid">
              {completed.length > 0 ? completed.slice(0, 20).map((task: any) => (
                <div
                  key={task.id}
                  className="assignment-card completed"
                  style={{ borderLeftColor: task.course ? getCourseColor(task.course) : '#10b981' }}
                >
                  <div className="assignment-header">
                    <h3>{task.title}</h3>
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleComplete(task.id, task.completed)}
                      className="assignment-checkbox"
                    />
                  </div>
                  {task.course && (
                    <div
                      className="assignment-course"
                      style={{
                        backgroundColor: getCourseColor(task.course),
                        color: 'white',
                        opacity: 0.7
                      }}
                    >
                      {task.course}
                    </div>
                  )}
                  <div className="assignment-due completed-date">
                    ✅ {formatDueDate(task.due_date, task.due_time)}
                  </div>
                </div>
              )) : (
                <div className="no-assignments">
                  <p>{t("no_completed_assignments") || "No completed assignments"}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}