import { useState, useTransition } from "react";
import { useCourses, useTasks } from "../hooks/useApi";
import { useCourseColors } from "../hooks/useCourseColors";
import { useLanguage } from "../contexts/LanguageContext";
import { formatDateLocal } from "../utils/dateUtils";
import Header from "./Header";
import WeeklyCalendar from "./WeeklyCalendar";
import "./Dashboard.css";
import { getCourseSyllabusUrl } from "../hooks/useApi";

interface DashboardProps {
  user: { username: string };
  onLogout: () => void;
  currentTab: "dashboard" | "assignments" | "account";
  onTabChange: (tab: "dashboard" | "assignments" | "account") => void;
}

export default function Dashboard({
  user,
  onLogout,
  currentTab,
  onTabChange,
}: DashboardProps) {
  const { t } = useLanguage();
  const { getCourseColor } = useCourseColors();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    data: coursesData,
    isLoading: coursesLoading,
    error: coursesError,
  } = useCourses();

  // Get upcoming tasks (next 7 days)
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  // Get tasks from 1 week ago to 1 week from now
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(today.getDate() - 7);

  useTasks(formatDateLocal(oneWeekAgo), formatDateLocal(nextWeek));

  return (
    <div className="dashboard-container">
      <Header
        user={user}
        onLogout={onLogout}
        currentTab={currentTab}
        onTabChange={onTabChange}
      />

      <main className="dashboard-content">
        <div className="courses-section">
          <h2>{t("your_courses")}</h2>
          <div className="courses-grid">
            {coursesLoading ? (
              <div className="loading">{t("loading_courses")}</div>
            ) : coursesError ? (
              <div className="error">
                <p>Failed to load courses: {coursesError.message}</p>
              </div>
            ) : coursesData?.courses?.length > 0 ? (
              coursesData.courses.map((course: any) => (
                <div
                  key={course.id}
                  className={`course-card ${
                    selectedCourse === course.name ? "selected" : ""
                  } ${
                    selectedCourse && selectedCourse !== course.name
                      ? "dimmed"
                      : ""
                  }`}
                  style={{
                    borderLeftColor: getCourseColor(course.name),
                    borderBottomColor: getCourseColor(course.name),
                  }}
                  onClick={() =>
                    startTransition(() => {
                      setSelectedCourse(
                        selectedCourse === course.name ? null : course.name
                      );
                    })
                  }
                >
                  <h3>{course.name}</h3>
                  {course.canvas_course_id && (
                    <button
                      className="course-syllabus-button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        startTransition(() => {
                          getCourseSyllabusUrl(course.id)
                            .then((res) => {
                              if (res && res.url) {
                                window.open(res.url, "_blank");
                              }
                            })
                            .catch((err) => {
                              console.error("Failed to open syllabus:", err);
                            });
                        });
                      }}
                      disabled={isPending}
                    >
                      {isPending ? "Loading..." : "Syllabus"}
                    </button>
                  )}
                  {course.professor && course.professor !== "N/A" && (
                    <p>
                      <strong>Course Code:</strong> {course.professor}
                    </p>
                  )}
                  {course.credits && (
                    <p>
                      <strong>{t("credits")}:</strong> {course.credits}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="no-courses">
                <p>{t("no_courses")}</p>
                <p>
                  Add your Canvas API token in Account settings. Courses will
                  sync automatically when you log in.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* <div className="assignments-preview">
          <div className="section-header">
            <h2>{t("upcoming_assignments") || "다가오는 과제"}</h2>
            <button
              className="view-all-button"
              onClick={() => onTabChange('assignments')}
            >
              {t("view_all") || "전체 보기"} →
            </button>
          </div>

          {tasksLoading ? (
            <div className="loading">{t("loading") || "로딩 중..."}</div>
          ) : tasksData?.tasks?.length > 0 ? (
            <div className="assignments-preview-list">
              {tasksData.tasks
                .filter((task: any) => !task.completed)
                .slice(0, 3)
                .map((task: any) => (
                  <div
                    key={task.id}
                    className="assignment-preview-card"
                    style={{
                      borderLeftColor: task.course ? getCourseColor(task.course) : '#6b7280'
                    }}
                  >
                    <h4>{task.title}</h4>
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
                      📅 {formatDateShort(new Date(task.due_date), language)}
                      {task.due_time && ` ${task.due_time}`}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="no-assignments">
              <p>{t("no_assignments") || "과제가 없습니다"}</p>
            </div>
          )}
        </div> */}

        <div className="calendar-section">
          <WeeklyCalendar
            onDateSelect={(date) => console.log("Selected date:", date)}
            selectedCourse={selectedCourse}
            onTabChange={onTabChange}
          />
        </div>

        {/* <div className="features-section">
          <h2>{t("available_features")}</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>{t("performance_analytics")}</h3>
              <p>{t("performance_analytics_desc")}</p>
              <button className="feature-button" disabled>
                {t("coming_soon")}
              </button>
            </div>
            <div className="feature-card">
              <h3>{t("task_scheduler")}</h3>
              <p>{t("task_scheduler_desc")}</p>
              <button className="feature-button" disabled>
                {t("coming_soon")}
              </button>
            </div>
            <div className="feature-card">
              <h3>{t("grade_tracker")}</h3>
              <p>{t("grade_tracker_desc")}</p>
              <button className="feature-button" disabled>
                {t("coming_soon")}
              </button>
            </div>
          </div>
        </div> */}
      </main>
    </div>
  );
}
