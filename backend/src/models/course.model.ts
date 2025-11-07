import { getAllQuery, runQuery, getQuery } from "../database";
import { Course } from "../types";

export const getUserCourses = async (userId: number): Promise<Course[]> => {
  return await getAllQuery("SELECT * FROM courses WHERE user_id = ?", [userId]);
};

export const deleteCanvasCourses = async (userId: number): Promise<void> => {
  await runQuery(
    "DELETE FROM courses WHERE user_id = ? AND canvas_course_id IS NOT NULL",
    [userId]
  );
};

export const createCourse = async (
  userId: number,
  courseName: string,
  canvasCourseId: string,
  professor?: string
): Promise<void> => {
  await runQuery(
    "INSERT INTO courses (user_id, name, canvas_course_id, professor, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    [userId, courseName, canvasCourseId, professor || null]
  );
};

export const getCourseByName = async (
  userId: number,
  courseName: string
): Promise<Course | null> => {
  return await getQuery(
    "SELECT * FROM courses WHERE user_id = ? AND name = ?",
    [userId, courseName]
  );
};

export const getCourseById = async (
  courseId: number
): Promise<Course | null> => {
  return await getQuery("SELECT * FROM courses WHERE id = ?", [courseId]);
};
