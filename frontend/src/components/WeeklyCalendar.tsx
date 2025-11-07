import { useState, useEffect } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { useTasks, updateTaskAPI, getTaskCanvasUrl } from "../hooks/useApi";
import { useCourseColors } from "../hooks/useCourseColors";
import { useQueryClient } from "@tanstack/react-query";
import { formatDateLocal, formatMonthDay } from "../utils/dateUtils";
import { truncateText } from "../utils/textUtils";
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
  submitted: boolean;
  description?: string;
}

interface WeeklyCalendarProps {
  onDateSelect?: (date: Date) => void;
  onTaskClick?: (task: Task, date: Date) => void;
  selectedCourse?: string | null;
  // Allow parent to change app tab (e.g., navigate to Assignments)
  onTabChange?: (tab: "dashboard" | "assignments" | "account") => void;
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
  onTabChange,
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
  // 과제를 due date 이전 며칠 동안 표시할지 설정 (기본값: 3일)
  const [showTaskDaysBefore, setShowTaskDaysBefore] = useState<number>(3);

  useEffect(() => {
    // Update date when window gains focus
    const handleFocus = () => {
      setCurrentDate(new Date());
      console.log("📅 Date updated on focus:", new Date().toDateString());
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
        console.log("🌙 Date updated at midnight:", new Date().toDateString());
        updateDateAtMidnight(); // Schedule next midnight update
      }, timeUntilMidnight);

      return timer;
    };

    window.addEventListener("focus", handleFocus);
    const midnightTimer = updateDateAtMidnight();

    return () => {
      window.removeEventListener("focus", handleFocus);
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

  // API tasks → DayTasks (모든 과제를 due date에만 배치)
  const convertTasksToDayTasks = (apiTasks: Task[]): DayTasks => {
    const dayTasks: DayTasks = {};
    if (!apiTasks) return dayTasks;

    apiTasks.forEach((task) => {
      const dueDateKey = task.due_date;
      if (!dayTasks[dueDateKey]) dayTasks[dueDateKey] = [];
      dayTasks[dueDateKey].push(task);
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
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
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

  const formatWeekRangeWithLocale = (start?: Date, end?: Date): string => {
    if (!start || !end) return "";
    const locale = language === "ko" ? "ko-KR" : "en-US";

    if (start.getMonth() === end.getMonth()) {
      const monthStr = start.toLocaleDateString(locale, { month: "short" });
      return language === "ko"
        ? `${monthStr} ${start.getDate()}–${end.getDate()}일`
        : `${monthStr} ${start.getDate()}–${end.getDate()}`;
    }
    return `${formatMonthDay(start, locale)} – ${formatMonthDay(end, locale)}`;
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
        <div className="calendar-header-controls">
          <p className="calendar-subtitle">
            {weeks[0]?.startDate && weeks[3]?.endDate
              ? formatWeekRangeWithLocale(weeks[0].startDate, weeks[3].endDate)
              : "Loading..."}
          </p>
          <div className="task-preview-control">
            <label htmlFor="task-preview-days">
              {language === "ko" ? "과제 미리보기:" : "Show tasks"}
            </label>
            <select
              id="task-preview-days"
              value={showTaskDaysBefore}
              onChange={(e) => setShowTaskDaysBefore(Number(e.target.value))}
              className="task-preview-select"
            >
              <option value={0}>
                {language === "ko" ? "당일만" : "Due date only"}
              </option>
              <option value={1}>
                {language === "ko" ? "1일 전부터" : "1 day before"}
              </option>
              <option value={2}>
                {language === "ko" ? "2일 전부터" : "2 days before"}
              </option>
              <option value={3}>
                {language === "ko" ? "3일 전부터" : "3 days before"}
              </option>
              <option value={5}>
                {language === "ko" ? "5일 전부터" : "5 days before"}
              </option>
              <option value={7}>
                {language === "ko" ? "7일 전부터" : "7 days before"}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div className="weeks-container">
        {(() => {
          // 전체 4주에 대한 전역 task row mapping 생성
          const globalTaskRows = new Map<string, number>();
          const globalRowOccupancy: Array<Array<[number, number]>> = [];

          // 모든 주의 모든 과제 수집
          const allWeekTasks: Array<{
            task: Task;
            weekIndex: number;
            dayIndex: number;
            startPos: number;
            endPos: number;
          }> = [];

          weeks.forEach((week, weekIndex) => {
            week.days.forEach((day, dayIndex) => {
              const dayTasks = getTasksForDate(day);
              dayTasks.forEach((task) => {
                const totalDays = task.completed ? 1 : showTaskDaysBefore + 1;
                const startPos = weekIndex * 7 + dayIndex - (totalDays - 1);
                const endPos = weekIndex * 7 + dayIndex;

                allWeekTasks.push({
                  task,
                  weekIndex,
                  dayIndex,
                  startPos,
                  endPos,
                });
              });
            });
          });

          // Due date 기준으로 정렬 (이른 날짜가 먼저 = 위쪽 row)
          allWeekTasks.sort((a, b) => {
            const dateA = new Date(a.task.due_date).getTime();
            const dateB = new Date(b.task.due_date).getTime();
            return dateA - dateB;
          });

          // 전역적으로 row 배치 (task.id 기준으로 같은 과제는 같은 row)
          let nextAvailableRow = 0;

          allWeekTasks.forEach((weekTask) => {
            const taskKey = String(weekTask.task.id);

            // 이미 배치된 과제면 스킵
            if (globalTaskRows.has(taskKey)) return;

            // nextAvailableRow부터 시작해서 빈 row 찾기
            let foundRow = -1;
            for (let row = nextAvailableRow; row < 100; row++) {
              if (!globalRowOccupancy[row]) globalRowOccupancy[row] = [];

              // 이 row에서 겹치는지 확인
              const overlaps = globalRowOccupancy[row].some(
                ([occStart, occEnd]) =>
                  !(weekTask.endPos < occStart || weekTask.startPos > occEnd)
              );

              if (!overlaps) {
                globalRowOccupancy[row].push([
                  weekTask.startPos,
                  weekTask.endPos,
                ]);
                globalTaskRows.set(taskKey, row);
                foundRow = row;
                break;
              }
            }

            // 배치된 row가 nextAvailableRow이면, 다음 row로 이동
            if (foundRow === nextAvailableRow) {
              nextAvailableRow++;
            }
          });

          return weeks.map((week, weekIndex) => {
            const isCurrentWeek = weekIndex === 1;
            return (
              <div
                key={weekIndex}
                className={`week-section ${
                  isCurrentWeek ? "current-week" : ""
                }`}
              >
                <div className="week-header">
                  <span className="week-number">
                    {t("week") || "Week"} {week.weekNumber}
                  </span>
                  <span className="week-range">
                    {formatWeekRangeWithLocale(week.startDate, week.endDate)}
                  </span>
                  {isCurrentWeek && (
                    <span className="current-week-badge">
                      {t("current") || "Current"}
                    </span>
                  )}
                </div>

                <div className="week-grid-container">
                  {/* 날짜 헤더 */}
                  <div className="week-days-header">
                    {week.days.map((day, dayIndex) => (
                      <div
                        key={dayIndex}
                        className={`day-header ${isToday(day) ? "today" : ""} ${
                          isSelected(day) ? "selected" : ""
                        }`}
                        onClick={() => handleDateClick(day)}
                      >
                        <div className="day-name">{dayNames[dayIndex]}</div>
                        <div className="day-number">{day.getDate()}</div>
                      </div>
                    ))}
                  </div>

                  {/* 과제 막대 컨테이너 (absolute positioning) */}
                  <div
                    className="week-tasks-container"
                    style={{
                      minHeight: (() => {
                        // 이 주에 표시될 고유 과제들을 먼저 수집
                        const uniqueTaskIds = new Set<number>();

                        // 현재 주의 모든 과제 확인
                        week.days.forEach((day) => {
                          const dayTasks = getTasksForDate(day);
                          dayTasks.forEach((task) => {
                            uniqueTaskIds.add(task.id);
                          });
                        });

                        // 다음 주 과제 중 현재 주로 넘어오는 것들도 확인
                        if (weekIndex < weeks.length - 1) {
                          const nextWeek = weeks[weekIndex + 1];
                          nextWeek.days.slice(0, 7).forEach((day) => {
                            const dayTasks = getTasksForDate(day);
                            dayTasks.forEach((task) => {
                              const totalDays = task.completed
                                ? 1
                                : showTaskDaysBefore + 1;
                              const nextDayIndex = nextWeek.days.indexOf(day);
                              const startPos =
                                7 + nextDayIndex - (totalDays - 1);

                              // 현재 주에 걸치는 과제만
                              if (startPos < 7) {
                                uniqueTaskIds.add(task.id);
                              }
                            });
                          });
                        }

                        // 고유 과제들의 global row를 수집
                        const globalRowsUsed = new Set<number>();
                        uniqueTaskIds.forEach((taskId) => {
                          const row = globalTaskRows.get(String(taskId)) ?? 0;
                          globalRowsUsed.add(row);
                        });

                        // 로컬 row로 매핑 (0부터 시작)
                        const sortedGlobalRows = Array.from(
                          globalRowsUsed
                        ).sort((a, b) => a - b);
                        const localRowCount = sortedGlobalRows.length;
                        const height = Math.max(localRowCount * 40, 40);
                        console.log(
                          `Week ${weekIndex}: ${uniqueTaskIds.size} tasks, ${localRowCount} local rows, height=${height}px`
                        );
                        return `${height}px`;
                      })(),
                    }}
                  >
                    {(() => {
                      // 이 주의 모든 과제 수집
                      const weekTasks: Array<{
                        task: Task;
                        dayIndex: number;
                        startPos: number;
                        endPos: number;
                      }> = [];

                      // 현재 주의 과제들
                      week.days.forEach((day, dayIndex) => {
                        const dayTasks = getTasksForDate(day);
                        dayTasks.forEach((task) => {
                          const totalDays = task.completed
                            ? 1
                            : showTaskDaysBefore + 1;
                          const startPos = dayIndex - (totalDays - 1);
                          const endPos = dayIndex;

                          weekTasks.push({
                            task,
                            dayIndex,
                            startPos,
                            endPos,
                          });
                        });
                      });

                      // 다음 주 과제 중 현재 주로 넘어오는 것들
                      if (weekIndex < weeks.length - 1) {
                        const nextWeek = weeks[weekIndex + 1];
                        nextWeek.days
                          .slice(0, 7)
                          .forEach((day, nextDayIndex) => {
                            const dayTasks = getTasksForDate(day);
                            dayTasks.forEach((task) => {
                              const totalDays = task.completed
                                ? 1
                                : showTaskDaysBefore + 1;
                              const startPos =
                                7 + nextDayIndex - (totalDays - 1);

                              if (startPos < 7) {
                                const endPos = 7 + nextDayIndex;
                                weekTasks.push({
                                  task,
                                  dayIndex: nextDayIndex,
                                  startPos,
                                  endPos,
                                });
                              }
                            });
                          });
                      }

                      // 전역 row를 로컬 row로 변환 (0부터 다시 시작)
                      const globalRowsUsed = new Set<number>();
                      weekTasks.forEach((weekTask) => {
                        const globalRow =
                          globalTaskRows.get(String(weekTask.task.id)) ?? 0;
                        globalRowsUsed.add(globalRow);
                      });

                      // 정렬된 전역 row 리스트
                      const sortedGlobalRows = Array.from(globalRowsUsed).sort(
                        (a, b) => a - b
                      );

                      // 전역 row → 로컬 row 매핑
                      const globalToLocalRow = new Map<number, number>();
                      sortedGlobalRows.forEach((globalRow, localIndex) => {
                        globalToLocalRow.set(globalRow, localIndex);
                      });

                      // 렌더링 (전역 row를 로컬 row로 변환해서 사용)
                      return weekTasks.map((weekTask, taskIdx) => {
                        const { task, dayIndex, startPos, endPos } = weekTask;
                        const globalRow =
                          globalTaskRows.get(String(task.id)) ?? 0;
                        const row = globalToLocalRow.get(globalRow) ?? 0;

                        const isHighlighted =
                          !selectedCourse || task.course === selectedCourse;

                        const totalDays = endPos - startPos + 1;

                        // 현재 주 영역(0~6)에만 표시되도록 클리핑
                        const clippedStartPos = Math.max(startPos, 0);
                        const clippedEndPos = Math.min(endPos, 6);
                        const clippedDays = clippedEndPos - clippedStartPos + 1;

                        const barLeft = (clippedStartPos / 7) * 100;
                        const barWidth = (clippedDays / 7) * 100;

                        return (
                          <div
                            key={`${task.id}-${dayIndex}-${taskIdx}`}
                            className={`task-bar-absolute ${
                              task.completed ? "completed" : ""
                            } ${isHighlighted ? "highlighted" : "dimmed"}`}
                            style={{
                              backgroundColor: task.course
                                ? getCourseColor(task.course)
                                : getTaskTypeColor(task.type),
                              borderLeft: `3px solid ${getPriorityColor(
                                task.priority
                              )}`,
                              left: `${barLeft}%`,
                              width: `${barWidth}%`,
                              top: `${row * 40}px`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTaskClick(task, week.days[dayIndex]);
                            }}
                            title={`${getTaskTypeIcon(task.type)} ${
                              task.title
                            } - ${task.course || ""} (${
                              task.priority
                            } priority)`}
                          >
                            <div className="task-title">
                              {!task.completed
                                ? `${task.title} (D-${totalDays - 1})`
                                : task.title}
                            </div>
                            {task.due_time && (
                              <div className="task-time">
                                ⏰ {task.due_time}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            );
          });
        })()}
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
                <span className="task-modal-icon">
                  {getTaskTypeIcon(selectedTask.task.type)}
                </span>
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
                      __html: truncateText(selectedTask.task.description, 1000),
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
                className="task-open-original-button"
                onClick={async () => {
                  try {
                    const taskAny = selectedTask.task as any;
                    const urlFromTask =
                      taskAny.html_url ||
                      taskAny.url ||
                      taskAny.external_url ||
                      taskAny.assignment_url ||
                      (taskAny.plannable && taskAny.plannable.html_url) ||
                      null;

                    if (urlFromTask) {
                      window.open(urlFromTask, "_blank");
                      return;
                    }

                    // Try backend resolution (search Canvas assignments for this task)
                    try {
                      const res = await getTaskCanvasUrl(selectedTask.task.id);
                      if (res && res.url) {
                        window.open(res.url, "_blank");
                        return;
                      }
                    } catch (e) {
                      // resolution failed or not found; fallthrough to fallback
                      console.warn("Canvas URL resolution failed:", e);
                    }

                    // Fallback: switch to Assignments tab and store task id for context
                    try {
                      localStorage.setItem(
                        "dashboard_openTaskId",
                        String(selectedTask.task.id)
                      );
                    } catch (e) {
                      // ignore storage errors
                    }
                    if (typeof onTabChange === "function") {
                      onTabChange("assignments");
                    } else if (typeof window !== "undefined") {
                      window.location.href = window.location.pathname;
                    }
                  } catch (error) {
                    console.error("Error opening original assignment:", error);
                  }
                }}
              >
                {t("open_original") || "Open Original"}
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
