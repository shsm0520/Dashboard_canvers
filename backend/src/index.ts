import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cron from "node-cron";
import {
  initializeDatabase,
  runQuery,
  getQuery,
  getAllQuery,
  migrateUsersFromFile,
  closeDatabase,
} from "./database";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET =
  process.env.JWT_SECRET || "dashboard-jwt-secret-key-change-in-production";

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Database interfaces
interface User {
  id: number;
  username: string;
  password: string;
  canvas_token?: string;
  email: string;
  role: string;
  join_date: string;
  created_at: string;
  updated_at: string;
}

interface Course {
  id: number;
  user_id: number;
  name: string;
  professor?: string;
  credits?: number;
  canvas_course_id?: string;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: number;
  user_id: number;
  title: string;
  description?: string;
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
  created_at: string;
  updated_at: string;
}

// Database helper functions
const getUserByUsername = async (username: string): Promise<User | null> => {
  return await getQuery("SELECT * FROM users WHERE username = ?", [username]);
};

const getUserById = async (id: number): Promise<User | null> => {
  return await getQuery("SELECT * FROM users WHERE id = ?", [id]);
};

const updateUserCanvasToken = async (
  userId: number,
  canvasToken: string | null
): Promise<boolean> => {
  try {
    await runQuery(
      "UPDATE users SET canvas_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [canvasToken, userId]
    );
    return true;
  } catch (error) {
    console.error("Error updating canvas token:", error);
    return false;
  }
};

const getUserCourses = async (userId: number): Promise<Course[]> => {
  return await getAllQuery("SELECT * FROM courses WHERE user_id = ?", [userId]);
};

const getUserTasks = async (
  userId: number,
  startDate?: string,
  endDate?: string
): Promise<Task[]> => {
  let query = "SELECT * FROM tasks WHERE user_id = ?";
  const params: any[] = [userId];

  if (startDate && endDate) {
    query += " AND due_date BETWEEN ? AND ?";
    params.push(startDate, endDate);
  }

  query += " ORDER BY due_date ASC, due_time ASC";
  return await getAllQuery(query, params);
};

const createTask = async (
  task: Omit<Task, "id" | "created_at" | "updated_at">
): Promise<number> => {
  const result = await runQuery(
    "INSERT INTO tasks (user_id, title, description, type, course, due_date, due_time, priority, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      task.user_id,
      task.title,
      task.description,
      task.type,
      task.course,
      task.due_date,
      task.due_time,
      task.priority,
      task.completed,
    ]
  );
  return result.id;
};

const updateTask = async (
  taskId: number,
  userId: number,
  updates: Partial<Task>
): Promise<boolean> => {
  try {
    const setClauses = [];
    const params = [];

    if (updates.title !== undefined) {
      setClauses.push("title = ?");
      params.push(updates.title);
    }
    if (updates.description !== undefined) {
      setClauses.push("description = ?");
      params.push(updates.description);
    }
    if (updates.type !== undefined) {
      setClauses.push("type = ?");
      params.push(updates.type);
    }
    if (updates.course !== undefined) {
      setClauses.push("course = ?");
      params.push(updates.course);
    }
    if (updates.due_date !== undefined) {
      setClauses.push("due_date = ?");
      params.push(updates.due_date);
    }
    if (updates.due_time !== undefined) {
      setClauses.push("due_time = ?");
      params.push(updates.due_time);
    }
    if (updates.priority !== undefined) {
      setClauses.push("priority = ?");
      params.push(updates.priority);
    }
    if (updates.completed !== undefined) {
      setClauses.push("completed = ?");
      params.push(updates.completed);
    }

    if (setClauses.length === 0) {
      return false;
    }

    setClauses.push("updated_at = CURRENT_TIMESTAMP");
    params.push(taskId, userId);

    const query = `UPDATE tasks SET ${setClauses.join(
      ", "
    )} WHERE id = ? AND user_id = ?`;
    const result = await runQuery(query, params);
    return result.changes > 0;
  } catch (error) {
    console.error("Error updating task:", error);
    return false;
  }
};

const deleteTask = async (taskId: number, userId: number): Promise<boolean> => {
  try {
    const result = await runQuery(
      "DELETE FROM tasks WHERE id = ? AND user_id = ?",
      [taskId, userId]
    );
    return result.changes > 0;
  } catch (error) {
    console.error("Error deleting task:", error);
    return false;
  }
};

// Canvas API integration
interface CanvasCourse {
  id: number;
  longName: string;
  shortName: string;
  courseCode: string;
  term: string | null;
  subtitle?: string;
  enrollmentState?: string;
  enrollmentType?: string;
  published?: boolean;
}

interface CanvasAssignment {
  id: number;
  name: string;
  description?: string;
  course_id: number;
  due_at: string | null;
  unlock_at?: string | null;
  lock_at?: string | null;
  points_possible?: number;
  submission_types: string[];
  assignment_group_id: number;
  published: boolean;
  workflow_state: string;
  html_url: string;
  has_submitted_submissions?: boolean;
  is_quiz_assignment?: boolean; // True if this assignment is linked to a quiz
  quiz_id?: number; // Quiz ID if this is a quiz assignment
  is_quiz_lti_assignment?: boolean; // True if this is an LTI quiz assignment
}

interface CanvasPlannerItem {
  context_type: string;
  context_name: string;
  plannable_type: string;
  plannable: {
    id: number;
    title: string;
    assignment_id?: number;
    due_at: string | null;
    points_possible?: number;
    html_url: string;
  };
  plannable_date: string;
  submissions?: any;
}

interface CanvasModule {
  id: number;
  name: string;
  position: number;
  unlock_at?: string | null;
  require_sequential_progress?: boolean;
  publish_final_grade?: boolean;
  prerequisite_module_ids?: number[];
  state: string;
  completed_at?: string | null;
  items_count: number;
  items_url: string;
  items?: CanvasModuleItem[];
}

interface CanvasModuleItem {
  id: number;
  module_id: number;
  position: number;
  title: string;
  indent: number;
  type: string; // 'Assignment', 'Quiz', 'File', 'Page', 'Discussion', 'ExternalUrl', 'ExternalTool'
  content_id?: number;
  html_url?: string;
  url?: string;
  page_url?: string;
  external_url?: string;
  new_tab?: boolean;
  quiz_lti?: boolean; // True if this is an LTI quiz
  completion_requirement?: {
    type: string;
    min_score?: number;
    completed?: boolean;
  };
  content_details?: {
    due_at?: string | null;
    points_possible?: number;
    locked_for_user?: boolean;
    lock_explanation?: string;
  };
}

interface CanvasQuiz {
  id: number;
  title: string;
  html_url: string;
  mobile_url?: string;
  description?: string;
  quiz_type: 'practice_quiz' | 'assignment' | 'graded_survey' | 'survey';
  time_limit?: number | null;
  shuffle_answers: boolean;
  show_correct_answers: boolean;
  allowed_attempts: number;
  question_count: number;
  points_possible?: number | null;
  due_at?: string | null;
  lock_at?: string | null;
  unlock_at?: string | null;
  published: boolean;
  assignment_id?: number | null;
}

const fetchCanvasQuizzes = async (
  canvasToken: string,
  courseId: number
): Promise<CanvasQuiz[]> => {
  try {
    const response = await fetch(
      `https://uc.instructure.com/api/v1/courses/${courseId}/quizzes`,
      {
        headers: {
          Authorization: `Bearer ${canvasToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch quizzes for course ${courseId}: ${response.status}`);
      return [];
    }

    const quizzes: CanvasQuiz[] = await response.json();
    console.log(`Fetched ${quizzes.length} quizzes from course ${courseId}`);
    return quizzes.filter(quiz => quiz.published); // Only return published quizzes
  } catch (error) {
    console.error(`Error fetching Canvas quizzes for course ${courseId}:`, error);
    return [];
  }
};

const fetchCanvasCourses = async (
  canvasToken: string
): Promise<CanvasCourse[]> => {
  try {
    const response = await fetch(
      "https://uc.instructure.com/api/v1/dashboard/dashboard_cards",
      {
        headers: {
          Authorization: `Bearer ${canvasToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Canvas API error: ${response.status} ${response.statusText}`
      );
    }

    const courses: CanvasCourse[] = await response.json();

    // Filter out courses with null term
    return courses.filter((c) => c.term !== null && c.term !== "Communities");
  } catch (error) {
    console.error("Error fetching Canvas courses:", error);
    throw error;
  }
};

const fetchCanvasAssignment = async (
  canvasToken: string,
  courseId: number,
  assignmentId: number
): Promise<CanvasAssignment | null> => {
  try {
    const response = await fetch(
      `https://uc.instructure.com/api/v1/courses/${courseId}/assignments/${assignmentId}`,
      {
        headers: {
          Authorization: `Bearer ${canvasToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch assignment ${assignmentId}: ${response.status}`);
      return null;
    }

    const assignment: CanvasAssignment = await response.json();
    return assignment;
  } catch (error) {
    console.error(`Error fetching Canvas assignment ${assignmentId}:`, error);
    return null;
  }
};

const fetchCanvasAssignments = async (
  canvasToken: string,
  courseId: number
): Promise<CanvasAssignment[]> => {
  try {
    // Fetch both 'upcoming' and 'future' buckets to get all future assignments
    const buckets = ['upcoming', 'future'];
    const allAssignments = new Map<number, CanvasAssignment>();

    for (const bucket of buckets) {
      try {
        const response = await fetch(
          `https://uc.instructure.com/api/v1/courses/${courseId}/assignments?bucket=${bucket}&include[]=submission&include[]=overrides&include[]=all_dates&per_page=100`,
          {
            headers: {
              Authorization: `Bearer ${canvasToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          console.warn(`Failed to fetch ${bucket} assignments: ${response.status}`);
          continue;
        }

        const assignments: CanvasAssignment[] = await response.json();
        console.log(`Bucket '${bucket}': ${assignments.length} assignments`);

        // Add to map (deduplicates by ID)
        assignments.forEach(assignment => {
          if (assignment.published && assignment.workflow_state === 'published') {
            allAssignments.set(assignment.id, assignment);
          }
        });
      } catch (error) {
        console.warn(`Error fetching ${bucket} assignments:`, error);
        continue;
      }
    }

    const result = Array.from(allAssignments.values());
    console.log(`Total unique assignments: ${result.length}`);
    return result;
  } catch (error) {
    console.error(`Error fetching Canvas assignments for course ${courseId}:`, error);
    return [];
  }
};

const fetchCanvasModules = async (
  canvasToken: string,
  courseId: number
): Promise<CanvasModule[]> => {
  try {
    const response = await fetch(
      `https://uc.instructure.com/api/v1/courses/${courseId}/modules?include[]=items&include[]=content_details`,
      {
        headers: {
          Authorization: `Bearer ${canvasToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Canvas API error: ${response.status} ${response.statusText}`
      );
    }

    const modules: CanvasModule[] = await response.json();
    return modules;
  } catch (error) {
    console.error(`Error fetching Canvas modules for course ${courseId}:`, error);
    throw error;
  }
};

const fetchCanvasPlannerItems = async (
  canvasToken: string,
  startDate: string,
  endDate: string
): Promise<CanvasPlannerItem[]> => {
  try {
    // Try different API approaches that match Canvas dashboard
    const urls = [
      `https://uc.instructure.com/api/v1/planner/items?start_date=${startDate}&end_date=${endDate}`,
      `https://uc.instructure.com/api/v1/planner/items?start_date=${startDate}&end_date=${endDate}&context_codes[]=course&filter=new_activity`
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${canvasToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.warn(`Planner API ${url} failed with ${response.status}`);
          continue;
        }

        const items: CanvasPlannerItem[] = await response.json();
        console.log(`Fetched ${items.length} planner items from ${url}`);

        // Log all items to see what we're getting
        console.log(`\n=== ALL PLANNER ITEMS DEBUG ===`);
        items.forEach((item, index) => {
          console.log(`Item ${index + 1}:`);
          console.log(`  - plannable_type: ${item.plannable_type}`);
          console.log(`  - context_type: ${item.context_type}`);
          console.log(`  - title: ${item.plannable?.title}`);
          console.log(`  - due_at: ${item.plannable?.due_at}`);
          console.log(`  - context_name: ${item.context_name}`);
        });
        console.log(`===============================\n`);

        // Filter for assignments only (relaxed conditions)
        const assignments = items.filter((item) =>
          item.plannable_type === 'assignment' &&
          item.plannable?.due_at
        );

        console.log(`Filtered to ${assignments.length} assignment items`);
        return assignments;
      } catch (error) {
        console.warn(`Failed to fetch from ${url}:`, error);
        continue;
      }
    }

    throw new Error("All planner API endpoints failed");
  } catch (error) {
    console.error("Error fetching Canvas planner items:", error);
    throw error;
  }
};

// Helper function to extract date from Canvas API timestamp
const extractDateFromCanvasTimestamp = (
  timestampString: string,
  clientTimezone?: string,
  clientOffset?: number
): string => {
  console.log(`\n=== Canvas Date Parsing ===`);
  console.log(`Original timestamp: ${timestampString}`);

  // Method 1: Remove Z and parse as local time
  const withoutZ = timestampString.replace(/Z$/, '');
  const localDate = new Date(withoutZ);
  const method1 = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;

  // Method 2: Parse as UTC and extract components directly
  const utcDate = new Date(timestampString);
  const method2 = `${utcDate.getFullYear()}-${String(utcDate.getMonth() + 1).padStart(2, '0')}-${String(utcDate.getDate()).padStart(2, '0')}`;

  // Method 3: Parse as UTC and convert to Eastern Time
  const easternDate = new Date(utcDate.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const method3 = `${easternDate.getFullYear()}-${String(easternDate.getMonth() + 1).padStart(2, '0')}-${String(easternDate.getDate()).padStart(2, '0')}`;

  console.log(`Method 1 (no Z, local): ${method1}`);
  console.log(`Method 2 (UTC components): ${method2}`);
  console.log(`Method 3 (UTC->Eastern): ${method3}`);

  // For now, let's try Method 3 (proper timezone conversion)
  console.log(`Using Method 3: ${method3}`);
  console.log(`=========================\n`);

  return method3;
};

const syncCanvasAssignmentsToTasks = async (
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

      const dueDate = new Date(assignment.due_at);
      // Extract date from Canvas timestamp (may be local time with Z suffix)
      const dueDateStr = extractDateFromCanvasTimestamp(assignment.due_at, clientTimezone, clientOffset);

      const dueTimeStr = dueDate.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }); // HH:MM

      // Check if task already exists (by user, title, and course only)
      const existingTask = await getQuery(
        "SELECT id, due_date FROM tasks WHERE user_id = ? AND title = ? AND course = ?",
        [userId, assignment.name, courseName]
      );

      if (!existingTask) {
        // Determine if this is a quiz/exam based on submission types or quiz flags
        const isQuiz = assignment.is_quiz_assignment ||
                      assignment.is_quiz_lti_assignment ||
                      assignment.submission_types.includes('online_quiz') ||
                      assignment.submission_types.includes('external_tool');
        const taskType = isQuiz ? 'exam' : 'assignment';

        console.log(`Creating task: ${assignment.name} - Type: ${taskType} - Due: ${dueDateStr} at ${dueTimeStr}`);
        await createTask({
          user_id: userId,
          title: assignment.name,
          description: assignment.description || undefined,
          type: taskType,
          course: courseName || undefined,
          due_date: dueDateStr,
          due_time: dueTimeStr || undefined,
          priority: 'medium', // Default priority
          completed: false, // Set to false by default, user can manually mark as completed
        });
      } else {
        console.log(`Task exists: ${assignment.name} - Current due_date in DB: ${existingTask.due_date}, New: ${dueDateStr}`);
        // Determine task type
        const isQuiz = assignment.is_quiz_assignment ||
                      assignment.is_quiz_lti_assignment ||
                      assignment.submission_types.includes('online_quiz') ||
                      assignment.submission_types.includes('external_tool');
        const taskType = isQuiz ? 'exam' : 'assignment';

        // Update existing task with new due date and type (keep current completion status)
        await runQuery(
          "UPDATE tasks SET due_date = ?, due_time = ?, type = ? WHERE id = ?",
          [dueDateStr, dueTimeStr, taskType, existingTask.id]
        );
      }
    }
  } catch (error) {
    console.error("Error syncing Canvas assignments to tasks:", error);
    throw error;
  }
};

const syncCanvasQuizzesToTasks = async (
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
      if (!quiz.due_at || quiz.quiz_type === 'practice_quiz') {
        continue;
      }

      const dueDate = new Date(quiz.due_at);
      const dueDateStr = extractDateFromCanvasTimestamp(
        quiz.due_at,
        clientTimezone,
        clientOffset
      );

      const dueTimeStr = dueDate.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });

      // Check if task already exists
      const existingTask = await getQuery(
        "SELECT id, due_date FROM tasks WHERE user_id = ? AND title = ? AND course = ?",
        [userId, quiz.title, courseName]
      );

      if (!existingTask) {
        console.log(`Creating task from quiz: ${quiz.title} - Due: ${dueDateStr} at ${dueTimeStr}`);
        await createTask({
          user_id: userId,
          title: quiz.title,
          description: quiz.description || `${quiz.quiz_type} - ${quiz.question_count} questions${quiz.time_limit ? `, ${quiz.time_limit} minutes` : ''}`,
          type: quiz.quiz_type === 'survey' ? 'other' : 'exam',
          course: courseName || undefined,
          due_date: dueDateStr,
          due_time: dueTimeStr || undefined,
          priority: quiz.quiz_type === 'assignment' ? 'high' : 'medium',
          completed: false,
        });
        quizCount++;
      } else {
        console.log(`Task exists from quiz: ${quiz.title}`);
        // Update existing task
        await runQuery(
          "UPDATE tasks SET due_date = ?, due_time = ?, description = ? WHERE id = ?",
          [dueDateStr, dueTimeStr, quiz.description || `${quiz.quiz_type} - ${quiz.question_count} questions`, existingTask.id]
        );
      }
    }
  } catch (error) {
    console.error("Error syncing Canvas quizzes to tasks:", error);
    throw error;
  }

  return quizCount;
};

const syncCanvasModulesToTasks = async (
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
        if (item.type !== 'Assignment' && item.type !== 'Quiz') {
          continue;
        }

        // Check if content_details has due_at
        let dueAt: string | null = item.content_details?.due_at || null;
        let description = `Module: ${module.name}`;

        // If no due date in content_details, fetch assignment details
        if (!dueAt && item.content_id) {
          console.log(`⚠️ No content_details for ${item.title} (quiz_lti: ${item.quiz_lti})`);
          console.log(`Fetching assignment details for ${item.title} (ID: ${item.content_id})`);
          const assignmentDetails = await fetchCanvasAssignment(canvasToken, courseId, item.content_id);

          if (assignmentDetails) {
            console.log(`✓ Found assignment details: due_at=${assignmentDetails.due_at}`);
            dueAt = assignmentDetails.due_at;
            description = assignmentDetails.description || description;
          } else {
            console.log(`✗ Failed to fetch assignment details for ${item.title}`);
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

        const dueTimeStr = dueDate.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        });

        // Check if task already exists
        const existingTask = await getQuery(
          "SELECT id, due_date FROM tasks WHERE user_id = ? AND title = ? AND course = ?",
          [userId, item.title, courseName]
        );

        if (!existingTask) {
          const taskType = (item.type === 'Quiz' || item.quiz_lti) ? 'exam' : 'assignment';
          console.log(`Creating task from module: ${item.title} - Type: ${taskType} - Due: ${dueDateStr} at ${dueTimeStr}`);
          await createTask({
            user_id: userId,
            title: item.title,
            description: description,
            type: taskType,
            course: courseName || undefined,
            due_date: dueDateStr,
            due_time: dueTimeStr || undefined,
            priority: 'medium',
            completed: item.completion_requirement?.completed || false,
          });
          assignmentCount++;
        } else {
          console.log(`Task exists from module: ${item.title}`);
          // Update existing task
          const taskType = (item.type === 'Quiz' || item.quiz_lti) ? 'exam' : 'assignment';
          await runQuery(
            "UPDATE tasks SET due_date = ?, due_time = ?, description = ?, type = ?, completed = ? WHERE id = ?",
            [dueDateStr, dueTimeStr, description, taskType, item.completion_requirement?.completed || false, existingTask.id]
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

const syncCanvasPlannerItemsToTasks = async (
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
      const dueDateStr = extractDateFromCanvasTimestamp(item.plannable.due_at, clientTimezone, clientOffset);

      const dueTimeStr = dueDate.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }); // HH:MM

      // Check if task already exists (by user, title, and course only)
      const existingTask = await getQuery(
        "SELECT id, due_date FROM tasks WHERE user_id = ? AND title = ? AND course = ?",
        [userId, item.plannable.title, item.context_name]
      );

      // Check if submission exists and is submitted
      const hasSubmission = item.submissions &&
                           item.submissions.submitted &&
                           item.submissions.submitted === true;

      if (!existingTask) {
        await createTask({
          user_id: userId,
          title: item.plannable.title,
          description: undefined,
          type: 'assignment',
          course: item.context_name || undefined,
          due_date: dueDateStr,
          due_time: dueTimeStr || undefined,
          priority: 'medium', // Default priority
          completed: hasSubmission || false,
        });
      } else {
        console.log(`Task exists: ${item.plannable.title} - Current due_date in DB: ${existingTask.due_date}, New: ${dueDateStr}`);
        // Update existing task with new due date and completion status
        await runQuery(
          "UPDATE tasks SET completed = ?, due_date = ?, due_time = ? WHERE id = ?",
          [hasSubmission || false, dueDateStr, dueTimeStr, existingTask.id]
        );
      }
    }
  } catch (error) {
    console.error("Error syncing Canvas planner items to tasks:", error);
    throw error;
  }
};

// Check if user needs sync (smart caching)
const shouldSyncUser = async (userId: number): Promise<boolean> => {
  try {
    const lastSync = await getQuery(
      "SELECT last_sync_at FROM sync_logs WHERE user_id = ? AND status = 'success' ORDER BY last_sync_at DESC LIMIT 1",
      [userId]
    );

    if (!lastSync) {
      return true; // Never synced, need to sync
    }

    const now = new Date();
    const lastSyncTime = new Date(lastSync.last_sync_at);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Sync if last sync was more than 1 hour ago
    return lastSyncTime < oneHourAgo;
  } catch (error) {
    console.error("Error checking sync status:", error);
    return true; // On error, sync to be safe
  }
};

// Log sync operation
const logSync = async (
  userId: number,
  syncType: string,
  status: string,
  assignmentsCount: number = 0,
  modulesCount: number = 0,
  errorMessage?: string
): Promise<void> => {
  try {
    await runQuery(
      "INSERT INTO sync_logs (user_id, last_sync_at, sync_type, status, assignments_count, modules_count, error_message) VALUES (?, datetime('now'), ?, ?, ?, ?, ?)",
      [userId, syncType, status, assignmentsCount, modulesCount, errorMessage || null]
    );
  } catch (error) {
    console.error("Error logging sync:", error);
  }
};

const syncCanvasCoursesToDatabase = async (
  userId: number,
  canvasCourses: CanvasCourse[]
): Promise<void> => {
  try {
    // Clear existing Canvas courses for this user
    await runQuery(
      "DELETE FROM courses WHERE user_id = ? AND canvas_course_id IS NOT NULL",
      [userId]
    );

    // Insert new courses from Canvas
    for (const course of canvasCourses) {
      // Parse course name and code
      let courseName = course.shortName || course.longName;
      let courseCode = "N/A";

      // Try to extract course code from the name
      const nameMatch = courseName.match(/([A-Z]{2,6}\s?\d{4})/);
      if (nameMatch) {
        courseCode = nameMatch[1];
      } else {
        // Fallback to parsing courseCode field
        const courseCodeParts = course.courseCode.split("_");
        if (courseCodeParts.length > 1) {
          const codePart = courseCodeParts[1];
          const codeMatch = codePart.match(/([A-Z]{2,6}\d{4})/);
          if (codeMatch) {
            courseCode = codeMatch[1];
          }
        }
      }

      // Clean up course name - remove term info and extra details
      courseName = courseName
        .replace(/^\([^)]*\)\s*/, "") // Remove term prefix like (25FS-Full)
        .replace(/\s*\(\d+\)\s*$/, "") // Remove trailing (001) section numbers
        .trim();

      await runQuery(
        "INSERT INTO courses (user_id, name, canvas_course_id, professor, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        [userId, courseName, course.id.toString(), courseCode]
      );
    }
  } catch (error) {
    console.error("Error syncing Canvas courses to database:", error);
    throw error;
  }
};

// JWT Authentication Middleware
interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
      };
    }
  }
}

const authenticateToken = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = { userId: decoded.userId };
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

app.get("/api/health", (req, res) => {
  res.json({
    message: "Backend server is running!",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/me", authenticateToken, async (req, res) => {
  try {
    const user = await getUserByUsername(req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        username: user.username,
        hasCanvasToken: !!user.canvas_token,
        canvasTokenPreview: user.canvas_token
          ? user.canvas_token.substring(0, 10) + "..."
          : null,
      },
      authenticated: true,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const clientTimezone = req.headers['x-client-timezone'] as string;
  const clientOffset = req.headers['x-client-timezone-offset'] ?
    parseInt(req.headers['x-client-timezone-offset'] as string) : undefined;

  try {
    const user = await getUserByUsername(username);

    if (user && user.password === password) {
      // Smart sync: only sync if needed (more than 1 hour since last sync)
      if (user.canvas_token) {
        const needsSync = await shouldSyncUser(user.id);

        if (needsSync) {
          console.log(`🔄 User ${username} needs sync (last sync > 1 hour ago)`);
          try {
            // Sync courses
            const canvasCourses = await fetchCanvasCourses(user.canvas_token);
            await syncCanvasCoursesToDatabase(user.id, canvasCourses);
            console.log(`Auto-synced ${canvasCourses.length} Canvas courses for ${username}`);

            // Use Canvas Planner API for assignments (more accurate to dashboard view)
            // Match frontend calendar range: -1 week to +3 weeks (4 weeks total)
            const today = new Date();

          // Get Monday of current week
          const getMonday = (date: Date): Date => {
            const newDate = new Date(date);
            const day = newDate.getDay();
            const diff = newDate.getDate() - day + (day === 0 ? -6 : 1);
            newDate.setDate(diff);
            return newDate;
          };

          // Get wider date range: 2 months ago to 3 months from now
          const startDate = new Date(today);
          startDate.setMonth(today.getMonth() - 2);
          const endDate = new Date(today);
          endDate.setMonth(today.getMonth() + 3);

          const startDateStr = startDate.toISOString().split('T')[0];
          const endDateStr = endDate.toISOString().split('T')[0];

          // Use Course Assignments API with 'upcoming' bucket
          console.log(`Syncing upcoming assignments for all ${canvasCourses.length} courses...`);

          let totalAssignments = 0;

          for (const course of canvasCourses) {
            try {
              const cleanCourseName = (course.shortName || course.longName)
                .replace(/^\([^)]*\)\s*/, "")
                .replace(/\s*\(\d+\)\s*$/, "")
                .trim();

              // Sync assignments (includes LTI quizzes)
              const assignments = await fetchCanvasAssignments(user.canvas_token, course.id);
              console.log(`\n=== ${cleanCourseName} ===`);
              console.log(`Found ${assignments.length} upcoming assignments/quizzes`);

              await syncCanvasAssignmentsToTasks(user.id, assignments, cleanCourseName, clientTimezone, clientOffset);
              totalAssignments += assignments.length;
            } catch (error) {
              console.warn(`Failed to sync data for course ${course.id}:`, error);
            }
          }
          console.log(`\n✅ Auto-synced ${totalAssignments} total assignments/quizzes for ${username}`);

          // Log successful sync
          await logSync(user.id, 'login', 'success', totalAssignments, 0);
        } catch (error) {
          console.warn(`Failed to auto-sync Canvas data for ${username}:`, error);
          await logSync(user.id, 'login', 'failed', 0, 0, error instanceof Error ? error.message : 'Unknown error');
          // Continue with login even if Canvas sync fails
        }
      } else {
        console.log(`✅ User ${username} recently synced, using cached data`);
      }
      }

      // Generate JWT token
      const token = jwt.sign({ userId: username }, JWT_SECRET, {
        expiresIn: "24h",
      });

      res.json({
        success: true,
        message: "Login successful",
        user: { username: user.username },
        token,
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

app.post("/api/logout", (req, res) => {
  // With JWT, logout is handled on client side by removing token
  // Optionally, you could maintain a blacklist of tokens
  res.json({ success: true, message: "Logged out successfully" });
});

// Protected API endpoints - require JWT token
app.get("/api/courses", authenticateToken, async (req, res) => {
  try {
    const user = await getUserByUsername(req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const courses = await getUserCourses(user.id);
    res.json({
      courses: courses,
      user: req.user!.userId,
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Sync Canvas courses endpoint
app.post("/api/sync-canvas-courses", authenticateToken, async (req, res) => {
  try {
    const user = await getUserByUsername(req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.canvas_token) {
      return res.status(400).json({
        success: false,
        message:
          "Canvas token is required. Please add your Canvas API token first.",
      });
    }

    // Fetch courses from Canvas
    const canvasCourses = await fetchCanvasCourses(user.canvas_token);

    // Sync to database
    await syncCanvasCoursesToDatabase(user.id, canvasCourses);

    // Return the synced courses
    const updatedCourses = await getUserCourses(user.id);

    res.json({
      success: true,
      message: `Successfully synced ${canvasCourses.length} courses from Canvas`,
      courses: updatedCourses,
      canvasCoursesCount: canvasCourses.length,
    });
  } catch (error) {
    console.error("Error syncing Canvas courses:", error);

    if (error instanceof Error) {
      if (error.message.includes("Canvas API error: 401")) {
        res.status(401).json({
          success: false,
          message:
            "Canvas API token is invalid or expired. Please update your token.",
        });
      } else if (error.message.includes("Canvas API error")) {
        res.status(502).json({
          success: false,
          message: "Unable to connect to Canvas. Please try again later.",
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error while syncing courses",
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
});

// Clear all tasks and re-sync from Canvas
app.post("/api/reset-and-sync-canvas", authenticateToken, async (req, res) => {
  try {
    const clientTimezone = req.headers['x-client-timezone'] as string;
    const clientOffset = req.headers['x-client-timezone-offset'] ?
      parseInt(req.headers['x-client-timezone-offset'] as string) : undefined;

    const user = await getUserByUsername(req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.canvas_token) {
      return res.status(400).json({
        success: false,
        message: "Canvas token is required. Please add your Canvas API token first.",
      });
    }

    // STEP 1: Clear all existing tasks for this user
    console.log(`Clearing all tasks for user ${user.username}...`);
    await runQuery("DELETE FROM tasks WHERE user_id = ?", [user.id]);
    console.log(`All tasks cleared for user ${user.username}`);

    // STEP 2: Re-sync everything from Canvas
    console.log(`Re-syncing Canvas data for user ${user.username}...`);

    // Sync courses first
    const canvasCourses = await fetchCanvasCourses(user.canvas_token);
    await syncCanvasCoursesToDatabase(user.id, canvasCourses);
    console.log(`Re-synced ${canvasCourses.length} Canvas courses`);

    // Use extended date range to capture all assignments
    const today = new Date();

    // Get wider date range: 2 months ago to 3 months from now
    const startDate = new Date(today);
    startDate.setMonth(today.getMonth() - 2);
    const endDate = new Date(today);
    endDate.setMonth(today.getMonth() + 3);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    let assignmentCount = 0;

    // Use Course Assignments API with 'upcoming' bucket
    console.log(`Syncing upcoming assignments for all ${canvasCourses.length} courses...`);

    for (const course of canvasCourses) {
      try {
        const cleanCourseName = (course.shortName || course.longName)
          .replace(/^\([^)]*\)\s*/, "")
          .replace(/\s*\(\d+\)\s*$/, "")
          .trim();

        // Sync assignments (includes LTI quizzes)
        const assignments = await fetchCanvasAssignments(user.canvas_token, course.id);
        console.log(`\n=== ${cleanCourseName}: ${assignments.length} assignments/quizzes`);

        await syncCanvasAssignmentsToTasks(user.id, assignments, cleanCourseName, clientTimezone, clientOffset);
        assignmentCount += assignments.length;
      } catch (error) {
        console.warn(`Failed to sync data for course ${course.id}:`, error);
      }
    }
    console.log(`\n✅ Re-synced ${assignmentCount} total assignments/quizzes`);

    res.json({
      success: true,
      message: `Successfully reset and re-synced all data. ${canvasCourses.length} courses, ${assignmentCount} assignments/quizzes synced.`,
      courses: canvasCourses.length,
      assignments: assignmentCount
    });

  } catch (error) {
    console.error("Error in reset and sync:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset and sync Canvas data",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Sync Canvas assignments endpoint
app.post("/api/sync-canvas-assignments", authenticateToken, async (req, res) => {
  try {
    const clientTimezone = req.headers['x-client-timezone'] as string;
    const clientOffset = req.headers['x-client-timezone-offset'] ?
      parseInt(req.headers['x-client-timezone-offset'] as string) : undefined;

    const user = await getUserByUsername(req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.canvas_token) {
      return res.status(400).json({
        success: false,
        message: "Canvas token is required. Please add your Canvas API token first.",
      });
    }

    // Use Canvas Course Assignments API directly (Planner API only returns announcements)
    const today = new Date();

    // Get wider date range: 2 months ago to 3 months from now
    const startDate = new Date(today);
    startDate.setMonth(today.getMonth() - 2);
    const endDate = new Date(today);
    endDate.setMonth(today.getMonth() + 3);

    let assignmentCount = 0;
    let moduleItemCount = 0;

    // Fetch all courses and their assignments
    const canvasCourses = await fetchCanvasCourses(user.canvas_token);
    console.log(`Found ${canvasCourses.length} Canvas courses`);

    for (const course of canvasCourses) {
      try {
        const cleanCourseName = (course.shortName || course.longName)
          .replace(/^\([^)]*\)\s*/, "")
          .replace(/\s*\(\d+\)\s*$/, "")
          .trim();

        // Sync assignments (includes LTI quizzes)
        const assignments = await fetchCanvasAssignments(user.canvas_token, course.id);
        console.log(`${cleanCourseName}: ${assignments.length} assignments/quizzes`);
        await syncCanvasAssignmentsToTasks(user.id, assignments, cleanCourseName, clientTimezone, clientOffset);
        assignmentCount += assignments.length;
      } catch (error) {
        console.warn(`Failed to sync data for course ${course.id}:`, error);
      }
    }

    res.json({
      success: true,
      message: `Successfully synced ${assignmentCount} assignments/quizzes from Canvas`,
      assignmentCount: assignmentCount
    });
  } catch (error) {
    console.error("Error syncing Canvas assignments:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while syncing assignments",
    });
  }
});

app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const user = await getUserByUsername(req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      profile: {
        username: user.username,
        email: user.email,
        joinDate: user.join_date?.split("T")[0] || "2024-01-01",
        role: user.role,
        hasCanvasToken: !!user.canvas_token,
        canvasTokenPreview: user.canvas_token
          ? user.canvas_token.substring(0, 10) + "..."
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update Canvas token endpoint
app.put("/api/canvas-token", authenticateToken, async (req, res) => {
  const { canvasToken } = req.body;

  if (!canvasToken || typeof canvasToken !== "string") {
    return res.status(400).json({
      success: false,
      message: "Canvas token is required and must be a string",
    });
  }

  if (canvasToken.length < 10) {
    return res.status(400).json({
      success: false,
      message: "Canvas token appears to be invalid (too short)",
    });
  }

  try {
    const user = await getUserByUsername(req.user!.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const success = await updateUserCanvasToken(user.id, canvasToken.trim());

    if (success) {
      res.json({
        success: true,
        message: "Canvas token updated successfully",
        canvasTokenPreview: canvasToken.substring(0, 10) + "...",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to save Canvas token",
      });
    }
  } catch (error) {
    console.error("Error updating canvas token:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Delete Canvas token endpoint
app.delete("/api/canvas-token", authenticateToken, async (req, res) => {
  try {
    const user = await getUserByUsername(req.user!.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const success = await updateUserCanvasToken(user.id, null);

    if (success) {
      res.json({
        success: true,
        message: "Canvas token removed successfully",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to remove Canvas token",
      });
    }
  } catch (error) {
    console.error("Error removing canvas token:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Tasks endpoints
app.get("/api/tasks", authenticateToken, async (req, res) => {
  try {
    const user = await getUserByUsername(req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { startDate, endDate } = req.query;
    const tasks = await getUserTasks(
      user.id,
      startDate as string,
      endDate as string
    );

    res.json({
      tasks: tasks,
      user: req.user!.userId,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/tasks", authenticateToken, async (req, res) => {
  try {
    const user = await getUserByUsername(req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { title, description, type, course, due_date, due_time, priority } =
      req.body;

    if (!title || !due_date || !type || !priority) {
      return res.status(400).json({
        message: "Title, due_date, type, and priority are required",
      });
    }

    const validTypes = [
      "assignment",
      "exam",
      "project",
      "meeting",
      "study",
      "deadline",
      "other",
    ];
    const validPriorities = ["high", "medium", "low"];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid task type" });
    }

    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ message: "Invalid priority" });
    }

    const taskId = await createTask({
      user_id: user.id,
      title,
      description: description || undefined,
      type,
      course: course || undefined,
      due_date,
      due_time: due_time || undefined,
      priority,
      completed: false,
    });

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      taskId: taskId,
    });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/api/tasks/:id", authenticateToken, async (req, res) => {
  try {
    const user = await getUserByUsername(req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const updates = req.body;
    const success = await updateTask(taskId, user.id, updates);

    if (success) {
      res.json({
        success: true,
        message: "Task updated successfully",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Task not found or no changes made",
      });
    }
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/api/tasks/:id", authenticateToken, async (req, res) => {
  try {
    const user = await getUserByUsername(req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const success = await deleteTask(taskId, user.id);

    if (success) {
      res.json({
        success: true,
        message: "Task deleted successfully",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/analytics", authenticateToken, (req, res) => {
  res.json({
    analytics: {
      totalCourses: 3,
      completedAssignments: 12,
      pendingAssignments: 5,
      averageGrade: "A-",
    },
    user: req.user!.userId,
  });
});

// Public endpoints (no authentication required)
app.get("/api/public/announcements", (req, res) => {
  res.json({
    announcements: [
      {
        id: 1,
        title: "Welcome to Dashboard",
        message: "Get started with your courses!",
        date: "2024-01-01",
      },
    ],
  });
});

// Background sync scheduler
const syncAllActiveUsers = async () => {
  console.log('\n🔄 === Background Sync Started ===');

  try {
    // Get all users with Canvas tokens who have synced in the last 7 days
    const activeUsers = await getAllQuery(`
      SELECT DISTINCT u.id, u.username, u.canvas_token
      FROM users u
      LEFT JOIN sync_logs s ON u.id = s.user_id
      WHERE u.canvas_token IS NOT NULL
      AND (
        s.last_sync_at > datetime('now', '-7 days')
        OR s.last_sync_at IS NULL
      )
    `);

    console.log(`Found ${activeUsers.length} active users to sync`);

    let syncedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const user of activeUsers) {
      try {
        // Check if user needs sync (more than 1 hour ago)
        const needsSync = await shouldSyncUser(user.id);

        if (!needsSync) {
          skippedCount++;
          console.log(`⏭️  Skipped ${user.username} (recently synced)`);
          continue;
        }

        console.log(`🔄 Syncing ${user.username}...`);

        // Sync courses
        const canvasCourses = await fetchCanvasCourses(user.canvas_token);
        await syncCanvasCoursesToDatabase(user.id, canvasCourses);

        // Sync assignments (includes LTI quizzes)
        let totalAssignments = 0;

        for (const course of canvasCourses) {
          const cleanCourseName = (course.shortName || course.longName)
            .replace(/^\([^)]*\)\s*/, "")
            .replace(/\s*\(\d+\)\s*$/, "")
            .trim();

          const assignments = await fetchCanvasAssignments(user.canvas_token, course.id);
          await syncCanvasAssignmentsToTasks(user.id, assignments, cleanCourseName, undefined, undefined);
          totalAssignments += assignments.length;

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        await logSync(user.id, 'background', 'success', totalAssignments, 0);
        syncedCount++;
        console.log(`✅ Synced ${user.username}: ${totalAssignments} assignments/quizzes`);

      } catch (error) {
        failedCount++;
        console.error(`❌ Failed to sync ${user.username}:`, error);
        await logSync(user.id, 'background', 'failed', 0, 0, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    console.log(`\n✅ === Background Sync Complete ===`);
    console.log(`   Synced: ${syncedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}\n`);

  } catch (error) {
    console.error('❌ Background sync error:', error);
  }
};

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    console.log("Database initialized successfully");

    // Migrate existing users from file
    await migrateUsersFromFile();

    // Start background sync scheduler (every 3 hours)
    cron.schedule('0 */3 * * *', syncAllActiveUsers);
    console.log('⏰ Background sync scheduler started (every 3 hours)');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log("JWT Secret:", JWT_SECRET.substring(0, 20) + "...");
      console.log("Database: SQLite");
      console.log(
        "Protected endpoints: /api/me, /api/courses, /api/profile, /api/analytics"
      );
      console.log(
        "Public endpoints: /api/health, /api/login, /api/logout, /api/public/*"
      );
    });
  } catch (error) {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  try {
    await closeDatabase();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error closing database:", error);
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  try {
    await closeDatabase();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error closing database:", error);
  }
  process.exit(0);
});

startServer();
