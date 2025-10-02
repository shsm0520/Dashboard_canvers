import { useState, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { useTasks, updateTaskAPI } from "../hooks/useApi";
import { useCourseColors } from "../hooks/useCourseColors";
import { useQueryClient } from "@tanstack/react-query";
import { formatDateLocal } from "../utils/dateUtils";
import { stripHtmlTags, truncateText } from "../utils/textUtils";
import "./WeeklyCalendar.css";

interface Task {
  id: number;
  title: string;
  type:
    | "assignment"
    | "exam"
    | "project"
    | "meeting"
    | "study"
    | "deadline"
    | "other";
  course?: string;
  due_date: string;
  due_time?: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
  description?: string;
}

interface WeeklyCalendarProps {
  onDateSelect?: (date: Date) => void;
  onTaskClick?: (task: Task, date: Date) => void;
  selectedCourse?: string | null;
}

interface WeekInfo {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  days: Date[];
}

interface DayTasks {
  [dateKey: string]: Task[];
}

export default function WeeklyCalendar({
  onDateSelect,
  onTaskClick,
  selectedCourse,
}: WeeklyCalendarProps) {
  const { t, language } = useLanguage(); // language 코드("ko" | "en")
  const { getCourseColor } = useCourseColors();
  const queryClient = useQueryClient();

  // Update current date when window gains focus or at midnight
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [weeks, setWeeks] = useState<WeekInfo[]>([]);
  const [selectedTask, setSelectedTask] = useState<{
    task: Task;
    date: Date;
  } | null>(null);

  useEffect(() => {
    // Update date when window gains focus
    const handleFocus = () => {
      setCurrentDate(new Date());
      console.log('📅 Date updated on focus:', new Date().toDateString());
    };

    // Update date at midnight
    const updateDateAtMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const timeUntilMidnight = tomorrow.getTime() - now.getTime();

      const timer = setTimeout(() => {
        setCurrentDate(new Date());
        console.log('🌙 Date updated at midnight:', new Date().toDateString());
        updateDateAtMidnight(); // Schedule next midnight update
      }, timeUntilMidnight);

      return timer;
    };

    window.addEventListener('focus', handleFocus);
    const midnightTimer = updateDateAtMidnight();

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearTimeout(midnightTimer);
    };
  }, []);

  // 주차 계산
  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  // 월요일 구하기
  const getMonday = (date: Date): Date => {
    const newDate = new Date(date);
    const day = newDate.getDay();
    const diff = newDate.getDate() - day + (day === 0 ? -6 : 1);
    newDate.setDate(diff);
    return newDate;
  };

  // 4주 범위 계산
  const getDateRange = () => {
    const today = new Date(currentDate);
    const currentMonday = getMonday(today);
    const startDate = new Date(currentMonday);
    startDate.setDate(currentMonday.getDate() - 7);
    const endDate = new Date(currentMonday);
    endDate.setDate(currentMonday.getDate() + 21);
    return {
      startDate: formatDateLocal(startDate),
      endDate: formatDateLocal(endDate),
    };
  };

  const { startDate, endDate } = getDateRange();
  const {
    data: tasksData,
    isLoading: tasksLoading,
    error: tasksError,
  } = useTasks(startDate, endDate);

  // 주 생성
  const generateWeeks = (): WeekInfo[] => {
    const today = new Date(currentDate);
    const currentMonday = getMonday(today);
    const weeksList: WeekInfo[] = [];

    for (let i = -1; i <= 2; i++) {
      const weekStart = new Date(currentMonday);
      weekStart.setDate(currentMonday.getDate() + i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const days: Date[] = [];
      for (let j = 0; j < 7; j++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + j);
        days.push(day);
      }

      weeksList.push({
        weekNumber: getWeekNumber(weekStart),
        startDate: weekStart,
        endDate: weekEnd,
        days,
      });
    }
    return weeksList;
  };

  // API tasks → DayTasks
  const convertTasksToDayTasks = (apiTasks: Task[]): DayTasks => {
    const dayTasks: DayTasks = {};
    if (!apiTasks) return dayTasks;
    apiTasks.forEach((task) => {
      const dateKey = task.due_date;
      if (!dayTasks[dateKey]) dayTasks[dateKey] = [];
      dayTasks[dateKey].push(task);
    });
    return dayTasks;
  };

  useEffect(() => {
    try {
      setWeeks(generateWeeks());
    } catch (error) {
      console.error("Error generating weeks:", error);
      setWeeks([]);
    }
  }, [currentDate]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  const handleTaskClick = (task: Task, date: Date) => {
    setSelectedTask({ task, date });
    onTaskClick?.(task, date);
  };

  const getTasksForDate = (date: Date): Task[] => {
    // Use local timezone instead of UTC to avoid +1 day offset
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    const dayTasks = convertTasksToDayTasks(tasksData?.tasks || []);
    return dayTasks[dateKey] || [];
  };

  const getTaskTypeColor = (type: Task["type"]): string => {
    const colors = {
      assignment: "#3b82f6",
      exam: "#ef4444",
      project: "#8b5cf6",
      meeting: "#10b981",
      study: "#f59e0b",
      deadline: "#f97316",
      other: "#6b7280",
    };
    return colors[type];
  };

  const getTaskTypeIcon = (type: Task["type"]): string => {
    const icons = {
      assignment: "📝",
      exam: "📋",
      project: "🎯",
      meeting: "👥",
      study: "📚",
      deadline: "⏰",
      other: "📌",
    };
    return icons[type];
  };

  const getPriorityColor = (priority: Task["priority"]): string => {
    const colors = {
      high: "#ef4444",
      medium: "#f59e0b",
      low: "#10b981",
    };
    return colors[priority];
  };


  const isToday = (date: Date): boolean =>
    date.toDateString() === new Date().toDateString();
  const isSelected = (date: Date): boolean =>
    selectedDate ? date.toDateString() === selectedDate.toDateString() : false;

  const formatDate = (date?: Date): string => {
    if (!date) return "";
    return date.toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatWeekRange = (start?: Date, end?: Date): string => {
    if (!start || !end) return "";
    const locale = language === "ko" ? "ko-KR" : "en-US";
    const startMonth = start.getMonth();
    const endMonth = end.getMonth();
    const formatMonthDay = (d: Date) =>
      d.toLocaleDateString(locale, { month: "short", day: "numeric" });

    if (startMonth === endMonth) {
      const monthStr = start.toLocaleDateString(locale, { month: "short" });
      return language === "ko"
        ? `${monthStr} ${start.getDate()}–${end.getDate()}일`
        : `${monthStr} ${start.getDate()}–${end.getDate()}`;
    }
    return `${formatMonthDay(start)} – ${formatMonthDay(end)}`;
  };

  const dayNames = [
    t("monday") || "Mon",
    t("tuesday") || "Tue",
    t("wednesday") || "Wed",
    t("thursday") || "Thu",
    t("friday") || "Fri",
    t("saturday") || "Sat",
    t("sunday") || "Sun",
  ];

  if (weeks.length === 0 || tasksLoading) {
    return (
      <div className="weekly-calendar">
        <div className="calendar-header">
          <h2>{t("weekly_schedule") || "주간 일정"}</h2>
          <p className="calendar-subtitle">Loading calendar...</p>
        </div>
        <div className="calendar-loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (tasksError) console.error("Tasks error:", tasksError);

  return (
    <div className="weekly-calendar">
      <div className="calendar-header">
        <h2>{t("weekly_schedule") || "주간 일정"}</h2>
        <p className="calendar-subtitle">
          {weeks[0]?.startDate && weeks[3]?.endDate
            ? formatWeekRange(weeks[0].startDate, weeks[3].endDate)
            : "Loading..."}
        </p>
      </div>

      <div className="weeks-container">
        {weeks.map((week, weekIndex) => {
          const isCurrentWeek = weekIndex === 1;
          return (
            <div
              key={weekIndex}
              className={`week-section ${isCurrentWeek ? "current-week" : ""}`}
            >
              <div className="week-header">
                <span className="week-number">
                  {t("week") || "Week"} {week.weekNumber}
                </span>
                <span className="week-range">
                  {formatWeekRange(week.startDate, week.endDate)}
                </span>
                {isCurrentWeek && (
                  <span className="current-week-badge">
                    {t("current") || "Current"}
                  </span>
                )}
              </div>

              <div className="days-grid">
                {week.days.map((day, dayIndex) => {
                  const dayTasks = getTasksForDate(day); // Show tasks for all weeks, not just current week
                  return (
                    <div
                      key={dayIndex}
                      className={`day-cell ${isToday(day) ? "today" : ""} ${
                        isSelected(day) ? "selected" : ""
                      }`}
                      onClick={() => handleDateClick(day)}
                    >
                      <div className="day-info">
                        <div className="day-name">{dayNames[dayIndex]}</div>
                        <div className="day-number">{day.getDate()}</div>
                      </div>

                      {dayTasks.length > 0 && (
                        <div className="day-tasks">
                          {dayTasks.slice(0, 5).map((task) => {
                            const isHighlighted = !selectedCourse || task.course === selectedCourse;
                            return (
                              <div
                                key={task.id}
                                className={`task-item ${
                                  task.completed ? "completed" : ""
                                } ${isHighlighted ? "highlighted" : "dimmed"}`}
                                style={{
                                  backgroundColor: task.course ? getCourseColor(task.course) : getTaskTypeColor(task.type),
                                  borderLeft: `3px solid ${getPriorityColor(
                                    task.priority
                                  )}`,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTaskClick(task, day);
                                }}
                                title={`${getTaskTypeIcon(task.type)} ${task.title} - ${task.course || ""} (${
                                  task.priority
                                } priority)`}
                              >
                                <div className="task-title">
                                  <span className="task-type-icon">{getTaskTypeIcon(task.type)}</span>
                                  {task.title}
                                </div>
                                {task.due_time && (
                                  <div className="task-time">⏰ {task.due_time}</div>
                                )}
                              </div>
                            );
                          })}
                          {dayTasks.length > 5 && (
                            <div className="more-tasks">
                              +{dayTasks.length - 5} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Modal */}
      {selectedTask && (
        <div
          className="task-modal-overlay"
          onClick={() => setSelectedTask(null)}
        >
          <div className="task-modal" onClick={(e) => e.stopPropagation()}>
            <div className="task-modal-header">
              <h3>
                <span className="task-modal-icon">{getTaskTypeIcon(selectedTask.task.type)}</span>
                {selectedTask.task.title}
              </h3>
              <button
                className="modal-close-button"
                onClick={() => setSelectedTask(null)}
              >
                ×
              </button>
            </div>

            <div className="task-modal-content">
              <div className="task-meta">
                <div className="task-meta-item">
                  <span className="task-label">{t("type") || "Type"}:</span>
                  <span
                    className="task-type-badge"
                    style={{
                      backgroundColor: getTaskTypeColor(selectedTask.task.type),
                    }}
                  >
                    {selectedTask.task.type}
                  </span>
                </div>

                <div className="task-meta-item">
                  <span className="task-label">
                    {t("priority") || "Priority"}:
                  </span>
                  <span
                    className="task-priority-badge"
                    style={{
                      backgroundColor: getPriorityColor(
                        selectedTask.task.priority
                      ),
                    }}
                  >
                    {selectedTask.task.priority}
                  </span>
                </div>

                {selectedTask.task.course && (
                  <div className="task-meta-item">
                    <span className="task-label">
                      {t("course") || "Course"}:
                    </span>
                    <span className="task-value">
                      {selectedTask.task.course}
                    </span>
                  </div>
                )}

                {selectedTask.task.due_time && (
                  <div className="task-meta-item">
                    <span className="task-label">{t("time") || "Time"}:</span>
                    <span className="task-value">
                      {selectedTask.task.due_time}
                    </span>
                  </div>
                )}

                <div className="task-meta-item">
                  <span className="task-label">{t("date") || "Date"}:</span>
                  <span className="task-value">
                    {selectedTask.date.toLocaleDateString(
                      language === "ko" ? "ko-KR" : "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        weekday: "long",
                      }
                    )}
                  </span>
                </div>

                <div className="task-meta-item">
                  <span className="task-label">{t("status") || "Status"}:</span>
                  <span
                    className={`task-status ${
                      selectedTask.task.completed ? "completed" : "pending"
                    }`}
                  >
                    {selectedTask.task.completed
                      ? t("completed") || "Completed"
                      : t("pending") || "Pending"}
                  </span>
                </div>
              </div>

              {selectedTask.task.description && (
                <div className="task-description">
                  <h4>{t("description") || "Description"}</h4>
                  <div
                    className="task-description-content"
                    dangerouslySetInnerHTML={{
                      __html: truncateText(selectedTask.task.description, 1000)
                    }}
                  />
                </div>
              )}
            </div>

            <div className="task-modal-footer">
              <button
                className="task-action-button"
                onClick={async () => {
                  try {
                    await updateTaskAPI(selectedTask.task.id, {
                      completed: !selectedTask.task.completed,
                    });
                    queryClient.invalidateQueries({ queryKey: ["tasks"] });
                    setSelectedTask({
                      ...selectedTask,
                      task: {
                        ...selectedTask.task,
                        completed: !selectedTask.task.completed,
                      },
                    });
                  } catch (error) {
                    console.error("Error updating task:", error);
                  }
                }}
              >
                {selectedTask.task.completed
                  ? t("mark_pending") || "Mark as Pending"
                  : t("mark_completed") || "Mark as Completed"}
              </button>
              <button
                className="task-close-button"
                onClick={() => setSelectedTask(null)}
              >
                {t("close") || "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
