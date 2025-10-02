import { config } from "../config/config";
import {
  CanvasCourse,
  CanvasAssignment,
  CanvasQuiz,
  CanvasModule,
  CanvasPlannerItem,
} from "../types";

const CANVAS_API_URL = config.canvasApiUrl;

export const fetchCanvasCourses = async (
  canvasToken: string
): Promise<CanvasCourse[]> => {
  try {
    const response = await fetch(
      `${CANVAS_API_URL}/dashboard/dashboard_cards?enrollmentState=active`,
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

export const fetchCanvasAssignment = async (
  canvasToken: string,
  courseId: number,
  assignmentId: number
): Promise<CanvasAssignment | null> => {
  try {
    const response = await fetch(
      `${CANVAS_API_URL}/courses/${courseId}/assignments/${assignmentId}`,
      {
        headers: {
          Authorization: `Bearer ${canvasToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.warn(
        `Failed to fetch assignment ${assignmentId}: ${response.status}`
      );
      return null;
    }

    const assignment: CanvasAssignment = await response.json();
    return assignment;
  } catch (error) {
    console.error(`Error fetching Canvas assignment ${assignmentId}:`, error);
    return null;
  }
};

export const fetchCanvasAssignments = async (
  canvasToken: string,
  courseId: number
): Promise<CanvasAssignment[]> => {
  try {
    const allAssignments = new Map<number, CanvasAssignment>();

    try {
      const response = await fetch(
        `${CANVAS_API_URL}/courses/${courseId}/assignments?&include[]=submission&include[]=overrides&include[]=all_dates&per_page=200`,
        {
          headers: {
            Authorization: `Bearer ${canvasToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.warn(`Failed to fetch  assignments: ${response.status}`);
      }

      const assignments: CanvasAssignment[] = await response.json();
      console.log(`${assignments.length} assignments`);

      // Add to map (deduplicates by ID)
      assignments.forEach((assignment) => {
        if (assignment.published && assignment.workflow_state === "published") {
          allAssignments.set(assignment.id, assignment);
        }
      });
    } catch (error) {
      console.warn(`Error fetching assignments:`, error);
    }

    const result = Array.from(allAssignments.values());
    console.log(`Total unique assignments: ${result.length}`);
    return result;
  } catch (error) {
    console.error(
      `Error fetching Canvas assignments for course ${courseId}:`,
      error
    );
    return [];
  }
};

export const fetchCanvasQuizzes = async (
  canvasToken: string,
  courseId: number
): Promise<CanvasQuiz[]> => {
  try {
    const response = await fetch(
      `${CANVAS_API_URL}/courses/${courseId}/quizzes?per_page=200`,
      {
        headers: {
          Authorization: `Bearer ${canvasToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch quizzes for course ${courseId}: ${response.status}`
      );
      return [];
    }

    const quizzes: CanvasQuiz[] = await response.json();
    console.log(`Fetched ${quizzes.length} quizzes from course ${courseId}`);
    return quizzes.filter((quiz) => quiz.published); // Only return published quizzes
  } catch (error) {
    console.error(
      `Error fetching Canvas quizzes for course ${courseId}:`,
      error
    );
    return [];
  }
};

export const fetchCanvasModules = async (
  canvasToken: string,
  courseId: number
): Promise<CanvasModule[]> => {
  try {
    const response = await fetch(
      `${CANVAS_API_URL}/courses/${courseId}/modules?include[]=items&include[]=content_details`,
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
    console.error(
      `Error fetching Canvas modules for course ${courseId}:`,
      error
    );
    throw error;
  }
};

export const fetchCanvasPlannerItems = async (
  canvasToken: string,
  startDate: string,
  endDate: string
): Promise<CanvasPlannerItem[]> => {
  try {
    // Try different API approaches that match Canvas dashboard
    const urls = [
      `${CANVAS_API_URL}/planner/items?start_date=${startDate}&end_date=${endDate}`,
      `${CANVAS_API_URL}/planner/items?start_date=${startDate}&end_date=${endDate}&context_codes[]=course&filter=new_activity`,
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
        const assignments = items.filter(
          (item) =>
            item.plannable_type === "assignment" && item.plannable?.due_at
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

export const cleanCourseName = (shortName: string, longName: string): string => {
  return (shortName || longName)
    .replace(/^\([^)]*\)\s*/, "") // Remove term prefix like (25FS-Full)
    .replace(/\s*\(\d+\)\s*$/, "") // Remove trailing (001) section numbers
    .trim();
};

export const extractCourseCode = (courseName: string, courseCode: string): string => {
  // Try to extract course code from the name
  const nameMatch = courseName.match(/([A-Z]{2,6}\s?\d{4})/);
  if (nameMatch) {
    return nameMatch[1];
  }

  // Fallback to parsing courseCode field
  const courseCodeParts = courseCode.split("_");
  if (courseCodeParts.length > 1) {
    const codePart = courseCodeParts[1];
    const codeMatch = codePart.match(/([A-Z]{2,6}\d{4})/);
    if (codeMatch) {
      return codeMatch[1];
    }
  }

  return "N/A";
};
