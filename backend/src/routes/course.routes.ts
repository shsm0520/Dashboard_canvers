import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { getUserByUsername } from "../models/user.model";
import { getUserCourses } from "../models/course.model";
import { deleteAllUserTasks } from "../models/task.model";
import {
  fetchCanvasCourses,
  cleanCourseName,
} from "../services/canvas.service";
import {
  syncCanvasCoursesToDatabase,
  performFullSync,
} from "../services/sync.service";
import { config } from "../config/config";
import { getDateRange } from "../utils/date.utils";
import { getCourseById } from "../models/course.model";

const router = Router();

router.get("/", authenticateToken, async (req, res) => {
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

router.post("/sync-canvas-courses", authenticateToken, async (req, res) => {
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

router.post("/sync-canvas-assignments", authenticateToken, async (req, res) => {
  try {
    const clientTimezone = req.headers["x-client-timezone"] as string;
    const clientOffset = req.headers["x-client-timezone-offset"]
      ? parseInt(req.headers["x-client-timezone-offset"] as string)
      : undefined;

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

    const result = await performFullSync(
      user.id,
      user.canvas_token,
      clientTimezone,
      clientOffset
    );

    res.json({
      success: true,
      message: `Successfully synced ${result.assignments} assignments/quizzes from Canvas`,
      assignmentCount: result.assignments,
    });
  } catch (error) {
    console.error("Error syncing Canvas assignments:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while syncing assignments",
    });
  }
});

router.post("/reset-and-sync-canvas", authenticateToken, async (req, res) => {
  try {
    const clientTimezone = req.headers["x-client-timezone"] as string;
    const clientOffset = req.headers["x-client-timezone-offset"]
      ? parseInt(req.headers["x-client-timezone-offset"] as string)
      : undefined;

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

    // STEP 1: Clear all existing tasks for this user
    console.log(`Clearing all tasks for user ${user.username}...`);
    await deleteAllUserTasks(user.id);
    console.log(`All tasks cleared for user ${user.username}`);

    // STEP 2: Re-sync everything from Canvas
    console.log(`Re-syncing Canvas data for user ${user.username}...`);

    const result = await performFullSync(
      user.id,
      user.canvas_token,
      clientTimezone,
      clientOffset
    );

    console.log(
      `\n✅ Re-synced ${result.assignments} total assignments/quizzes`
    );

    res.json({
      success: true,
      message: `Successfully reset and re-synced all data. ${result.courses} courses, ${result.assignments} assignments/quizzes synced.`,
      courses: result.courses,
      assignments: result.assignments,
    });
  } catch (error) {
    console.error("Error in reset and sync:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset and sync Canvas data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Return a Canvas syllabus URL for a course (by DB course id)
router.get("/:id/syllabus", authenticateToken, async (req, res) => {
  try {
    const user = await getUserByUsername(req.user!.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const courseId = parseInt(req.params.id);
    if (isNaN(courseId))
      return res.status(400).json({ message: "Invalid course id" });

    const course = await getCourseById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (course.user_id !== user.id)
      return res.status(403).json({ message: "Forbidden" });

    if (!course.canvas_course_id) {
      return res.status(404).json({ message: "No Canvas course id available" });
    }

    if (!user.canvas_token) {
      return res
        .status(400)
        .json({ message: "Canvas token not configured for user" });
    }

    // Try to fetch the course from Canvas API to get the authoritative `html_url`
    try {
      const canvasResp = await fetch(
        `${config.canvasApiUrl}/courses/${course.canvas_course_id}`,
        {
          headers: {
            Authorization: `Bearer ${user.canvas_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (canvasResp.ok) {
        const canvasCourse = await canvasResp.json();
        const htmlUrl =
          canvasCourse.html_url || canvasCourse.course_url || null;
        if (htmlUrl) {
          const base = htmlUrl.replace(/\/$/, "");
          const candidates = [`${base}/assignments/syllabus`];

          // Try HEAD requests to detect which syllabus URL works (some Canvas
          // installations respond differently: /syllabus vs /assignments/syllabus)
          for (const cand of candidates) {
            try {
              const headResp = await fetch(cand, {
                method: "HEAD",
                headers: { Authorization: `Bearer ${user.canvas_token}` },
              });
              if (headResp && headResp.ok) {
                return res.json({ url: cand });
              }
            } catch (e) {
              console.warn(`HEAD request failed for ${cand}:`, e);
              // ignore and try next
            }
          }

          // If HEAD didn't return ok for any candidate, log diagnostics and fall
          // back to returning the first candidate so frontend can still open it.
          console.warn(
            `No HEAD success for syllabus candidates. course:${
              course.canvas_course_id
            } candidates:${candidates.join(",")}`
          );
          return res.json({
            url: candidates[0],
            diagnostics: { tried: candidates },
          });
        }
      } else {
        const bodyText = await canvasResp.text().catch(() => "<no body>");
        console.warn(
          `Canvas course fetch failed (${canvasResp.status}) for course ${course.canvas_course_id} - body: ${bodyText}`
        );
      }
    } catch (err) {
      console.warn("Canvas course fetch error:", err);
    }

    // Fallback: construct a UI URL based on configured Canvas base
    const apiBase = config.canvasApiUrl.replace(/\/api\/?v?\d*$/i, "");
    const syllabusUrl = `${apiBase}/courses/${course.canvas_course_id}/assignments/syllabus`;

    return res.json({ url: syllabusUrl });
  } catch (error) {
    console.error("Error getting course syllabus url:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
