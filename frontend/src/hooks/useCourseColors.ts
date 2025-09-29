import { useMemo } from 'react';
import { useCourses, useTasks } from './useApi';
import { formatDateLocal } from '../utils/dateUtils';

export const useCourseColors = () => {
  const { data: coursesData } = useCourses();

  // Match WeeklyCalendar date range: -1 week to +3 weeks (4 weeks total)
  const today = new Date();

  // Get Monday of current week
  const getMonday = (date: Date): Date => {
    const newDate = new Date(date);
    const day = newDate.getDay();
    const diff = newDate.getDate() - day + (day === 0 ? -6 : 1);
    newDate.setDate(diff);
    return newDate;
  };

  const currentMonday = getMonday(today);
  const startDate = new Date(currentMonday);
  startDate.setDate(currentMonday.getDate() - 7); // -1 week
  const endDate = new Date(currentMonday);
  endDate.setDate(currentMonday.getDate() + 21); // +3 weeks

  const { data: tasksData } = useTasks(
    formatDateLocal(startDate),
    formatDateLocal(endDate)
  );

  const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#8b5cf6', // purple
    '#10b981', // green
    '#f59e0b', // yellow
    '#f97316', // orange
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#a855f7', // violet
    '#6366f1', // indigo
    '#dc2626', // red-600
    '#059669', // emerald
    '#7c2d12', // amber-900
    '#be185d', // pink-700
  ];

  // Get unique course names from all available data
  const uniqueCourses = useMemo(() => {
    const courseSet = new Set<string>();

    // Add courses from courses data
    if (coursesData?.courses) {
      coursesData.courses.forEach((course: any) => {
        if (course.name) courseSet.add(course.name);
      });
    }

    // Add courses from tasks data
    if (tasksData?.tasks) {
      tasksData.tasks.forEach((task: any) => {
        if (task.course) courseSet.add(task.course);
      });
    }

    return Array.from(courseSet).sort(); // Sort for consistency
  }, [coursesData, tasksData]);

  const getCourseColor = (courseName: string): string => {
    if (!courseName) return '#6b7280'; // gray for no course

    const index = uniqueCourses.indexOf(courseName);
    if (index === -1) return '#6b7280'; // fallback color

    return colors[index % colors.length];
  };

  return { getCourseColor, uniqueCourses };
};