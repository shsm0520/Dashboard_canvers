import {
  fetchCanvasCourses,
  fetchCanvasAssignments,
  fetchCanvasQuizzes,
  fetchCanvasModules,
  fetchCanvasAssignment,
  fetchCanvasPlannerItems,
  cleanCourseName,
  extractCourseCode,
} from "./canvas.service";
import {
  createTask,
  getTaskByUserAndTitle,
  deleteAllUserTasks,
} from "../models/task.model";
import {
  deleteCanvasCourses,
  createCourse,
} from "../models/course.model";
import { logSync } from "../models/sync.model";
import {
  extractDateFromCanvasTimestamp,
  formatTimeFromDate,
} from "../utils/date.utils";
import {
  CanvasCourse,
  CanvasAssignment,
  CanvasQuiz,
  CanvasModule,
  CanvasPlannerItem,
} from "../types";

export const syncCanvasCoursesToDatabase = async (
  userId: number,
  canvasCourses: CanvasCourse[]
): Promise<void> => {
  try {
    // Clear existing Canvas courses for this user
    await deleteCanvasCourses(userId);

    // Insert new courses from Canvas
    for (const course of canvasCourses) {
      // Parse course name and code
      let courseName = course.shortName || course.longName;
      const courseCode = extractCourseCode(courseName, course.courseCode);

      // Clean up course name - remove term info and extra details
      courseName = cleanCourseName(course.shortName, course.longName);

      await createCourse(userId, courseName, course.id.toString(), courseCode);
    }
  } catch (error) {
    console.error("Error syncing Canvas courses to database:", error);
    throw error;
  }
};

export const syncCanvasAssignmentsToTasks = async (
  userId: number,
  assignments: CanvasAssignment[],
  courseName: string,
  clientTimezone?: string,
  clientOffset?: number
): Promise<void> => {
  try {
    for (const assignment of assignments) {
      // Skip assignments without due dates (reading materials, etc.)
      if (!assignment.due_at) {
        console.log(`Skipping assignment without due date: ${assignment.name}`);
        continue;
      }

      // Skip optional assignments (no submission required and no points)
      if (
        assignment.submission_types.includes("none") &&
        (assignment.points_possible === 0 || assignment.points_possible === null || assignment.points_possible === undefined)
      ) {
        console.log(`Skipping optional assignment (no submission, no points): ${assignment.name}`);
        continue;
      }

      const dueDate = new Date(assignment.due_at);
      // Extract date from Canvas timestamp (may be local time with Z suffix)
      const dueDateStr = extractDateFromCanvasTimestamp(
        assignment.due_at,
        clientTimezone,
        clientOffset
      );

      const dueTimeStr = formatTimeFromDate(dueDate);

      // Check if task already exists (by user, title, and course only)
      const existingTask = await getTaskByUserAndTitle(
        userId,
        assignment.name,
        courseName
      );

      // Check if assignment has been submitted by checking submission object
      const isSubmitted =
        assignment.submission?.workflow_state === "submitted" ||
        assignment.submission?.workflow_state === "graded" ||
        (assignment.submission?.submitted_at !== null && assignment.submission?.submitted_at !== undefined);

      if (!existingTask) {
        // Determine if this is a quiz/exam based on submission types or quiz flags
        const isQuiz =
          assignment.is_quiz_assignment ||
          assignment.is_quiz_lti_assignment ||
          assignment.submission_types.includes("online_quiz") ||
          assignment.submission_types.includes("external_tool");
        const taskType = isQuiz ? "exam" : "assignment";

        console.log(
          `Creating task: ${assignment.name} - Type: ${taskType} - Due: ${dueDateStr} at ${dueTimeStr} - Submitted: ${isSubmitted}`
        );
        await createTask({
          user_id: userId,
          title: assignment.name,
          description: assignment.description || undefined,
          type: taskType,
          course: courseName || undefined,
          due_date: dueDateStr,
          due_time: dueTimeStr || undefined,
          priority: "medium", // Default priority
          completed: isSubmitted, // Mark as completed if submitted
          submitted: isSubmitted,
        });
      } else {
        console.log(
          `Task exists: ${assignment.name} - Current due_date in DB: ${existingTask.due_date}, New: ${dueDateStr} - Submitted: ${isSubmitted}`
        );
        // Determine task type
        const isQuiz =
          assignment.is_quiz_assignment ||
          assignment.is_quiz_lti_assignment ||
          assignment.submission_types.includes("online_quiz") ||
          assignment.submission_types.includes("external_tool");
        const taskType = isQuiz ? "exam" : "assignment";

        // Update existing task with new due date, type, and submission status
        const { runQuery } = await import("../database");
        await runQuery(
          "UPDATE tasks SET due_date = ?, due_time = ?, type = ?, submitted = ?, completed = ? WHERE id = ?",
          [dueDateStr, dueTimeStr, taskType, isSubmitted, isSubmitted, existingTask.id]
        );
      }
    }
  } catch (error) {
    console.error("Error syncing Canvas assignments to tasks:", error);
    throw error;
  }
};

export const syncCanvasQuizzesToTasks = async (
  userId: number,
  quizzes: CanvasQuiz[],
  courseName: string,
  clientTimezone?: string,
  clientOffset?: number
): Promise<number> => {
  let quizCount = 0;

  try {
    for (const quiz of quizzes) {
      // Skip quizzes without due dates or practice quizzes
      if (!quiz.due_at || quiz.quiz_type === "practice_quiz") {
        continue;
      }

      const dueDate = new Date(quiz.due_at);
      const dueDateStr = extractDateFromCanvasTimestamp(
        quiz.due_at,
        clientTimezone,
        clientOffset
      );

      const dueTimeStr = formatTimeFromDate(dueDate);

      // Check if task already exists
      const existingTask = await getTaskByUserAndTitle(
        userId,
        quiz.title,
        courseName
      );

      if (!existingTask) {
        console.log(
          `Creating task from quiz: ${quiz.title} - Due: ${dueDateStr} at ${dueTimeStr}`
        );
        await createTask({
          user_id: userId,
          title: quiz.title,
          description:
            quiz.description ||
            `${quiz.quiz_type} - ${quiz.question_count} questions${
              quiz.time_limit ? `, ${quiz.time_limit} minutes` : ""
            }`,
          type: quiz.quiz_type === "survey" ? "other" : "exam",
          course: courseName || undefined,
          due_date: dueDateStr,
          due_time: dueTimeStr || undefined,
          priority: quiz.quiz_type === "assignment" ? "high" : "medium",
          completed: false,
          submitted: false,
        });
        quizCount++;
      } else {
        console.log(`Task exists from quiz: ${quiz.title}`);
        // Update existing task
        const { runQuery } = await import("../database");
        await runQuery(
          "UPDATE tasks SET due_date = ?, due_time = ?, description = ? WHERE id = ?",
          [
            dueDateStr,
            dueTimeStr,
            quiz.description ||
              `${quiz.quiz_type} - ${quiz.question_count} questions`,
            existingTask.id,
          ]
        );
      }
    }
  } catch (error) {
    console.error("Error syncing Canvas quizzes to tasks:", error);
    throw error;
  }

  return quizCount;
};

export const syncCanvasModulesToTasks = async (
  userId: number,
  modules: CanvasModule[],
  courseName: string,
  canvasToken: string,
  courseId: number,
  clientTimezone?: string,
  clientOffset?: number
): Promise<number> => {
  let assignmentCount = 0;

  try {
    for (const module of modules) {
      if (!module.items || module.items.length === 0) continue;

      for (const item of module.items) {
        // Only process Assignment and Quiz types
        if (item.type !== "Assignment" && item.type !== "Quiz") {
          continue;
        }

        // Check if content_details has due_at
        let dueAt: string | null = item.content_details?.due_at || null;
        let description = `Module: ${module.name}`;

        // If no due date in content_details, fetch assignment details
        if (!dueAt && item.content_id) {
          console.log(
            `⚠️ No content_details for ${item.title} (quiz_lti: ${item.quiz_lti})`
          );
          console.log(
            `Fetching assignment details for ${item.title} (ID: ${item.content_id})`
          );
          const assignmentDetails = await fetchCanvasAssignment(
            canvasToken,
            courseId,
            item.content_id
          );

          if (assignmentDetails) {
            console.log(
              `✓ Found assignment details: due_at=${assignmentDetails.due_at}`
            );
            dueAt = assignmentDetails.due_at;
            description = assignmentDetails.description || description;
          } else {
            console.log(
              `✗ Failed to fetch assignment details for ${item.title}`
            );
          }
        }

        // Skip if still no due date
        if (!dueAt) {
          console.log(`Skipping ${item.title} - no due date`);
          continue;
        }

        const dueDate = new Date(dueAt);
        const dueDateStr = extractDateFromCanvasTimestamp(
          dueAt,
          clientTimezone,
          clientOffset
        );

        const dueTimeStr = formatTimeFromDate(dueDate);

        // Check if task already exists
        const existingTask = await getTaskByUserAndTitle(
          userId,
          item.title,
          courseName
        );

        if (!existingTask) {
          const taskType =
            item.type === "Quiz" || item.quiz_lti ? "exam" : "assignment";
          console.log(
            `Creating task from module: ${item.title} - Type: ${taskType} - Due: ${dueDateStr} at ${dueTimeStr}`
          );
          await createTask({
            user_id: userId,
            title: item.title,
            description: description,
            type: taskType,
            course: courseName || undefined,
            due_date: dueDateStr,
            due_time: dueTimeStr || undefined,
            priority: "medium",
            completed: item.completion_requirement?.completed || false,
            submitted: false,
          });
          assignmentCount++;
        } else {
          console.log(`Task exists from module: ${item.title}`);
          // Update existing task
          const taskType =
            item.type === "Quiz" || item.quiz_lti ? "exam" : "assignment";
          const { runQuery } = await import("../database");
          await runQuery(
            "UPDATE tasks SET due_date = ?, due_time = ?, description = ?, type = ?, completed = ? WHERE id = ?",
            [
              dueDateStr,
              dueTimeStr,
              description,
              taskType,
              item.completion_requirement?.completed || false,
              existingTask.id,
            ]
          );
        }
      }
    }
  } catch (error) {
    console.error("Error syncing Canvas modules to tasks:", error);
    throw error;
  }

  return assignmentCount;
};

export const syncCanvasPlannerItemsToTasks = async (
  userId: number,
  plannerItems: CanvasPlannerItem[],
  clientTimezone?: string,
  clientOffset?: number
): Promise<void> => {
  try {
    for (const item of plannerItems) {
      if (!item.plannable.due_at) continue;

      const dueDate = new Date(item.plannable.due_at);
      // Extract date from Canvas timestamp (may be local time with Z suffix)
      const dueDateStr = extractDateFromCanvasTimestamp(
        item.plannable.due_at,
        clientTimezone,
        clientOffset
      );

      const dueTimeStr = formatTimeFromDate(dueDate);

      // Check if task already exists (by user, title, and course only)
      const existingTask = await getTaskByUserAndTitle(
        userId,
        item.plannable.title,
        item.context_name
      );

      // Check if submission exists and is submitted
      const hasSubmission =
        item.submissions &&
        item.submissions.submitted &&
        item.submissions.submitted === true;

      if (!existingTask) {
        await createTask({
          user_id: userId,
          title: item.plannable.title,
          description: undefined,
          type: "assignment",
          course: item.context_name || undefined,
          due_date: dueDateStr,
          due_time: dueTimeStr || undefined,
          priority: "medium", // Default priority
          completed: hasSubmission || false,
          submitted: hasSubmission || false,
        });
      } else {
        console.log(
          `Task exists: ${item.plannable.title} - Current due_date in DB: ${existingTask.due_date}, New: ${dueDateStr}`
        );
        // Update existing task with new due date, submission status, and completion status
        const { runQuery } = await import("../database");
        await runQuery(
          "UPDATE tasks SET submitted = ?, completed = ?, due_date = ?, due_time = ? WHERE id = ?",
          [hasSubmission || false, hasSubmission || false, dueDateStr, dueTimeStr, existingTask.id]
        );
      }
    }
  } catch (error) {
    console.error("Error syncing Canvas planner items to tasks:", error);
    throw error;
  }
};

export const performFullSync = async (
  userId: number,
  canvasToken: string,
  clientTimezone?: string,
  clientOffset?: number
): Promise<{ courses: number; assignments: number }> => {
  // Sync courses
  const canvasCourses = await fetchCanvasCourses(canvasToken);
  await syncCanvasCoursesToDatabase(userId, canvasCourses);

  let totalAssignments = 0;

  for (const course of canvasCourses) {
    try {
      const courseName = cleanCourseName(course.shortName, course.longName);

      // Sync assignments (includes LTI quizzes)
      const assignments = await fetchCanvasAssignments(canvasToken, course.id);
      console.log(`\n=== ${courseName} ===`);
      console.log(`Found ${assignments.length} upcoming assignments/quizzes`);

      await syncCanvasAssignmentsToTasks(
        userId,
        assignments,
        courseName,
        clientTimezone,
        clientOffset
      );
      totalAssignments += assignments.length;
    } catch (error) {
      console.warn(`Failed to sync data for course ${course.id}:`, error);
    }
  }

  return {
    courses: canvasCourses.length,
    assignments: totalAssignments,
  };
};
