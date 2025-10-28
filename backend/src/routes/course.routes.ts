import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { getUserByUsername } from "../models/user.model";
import { getUserCourses } from "../models/course.model";
import { deleteAllUserTasks } from "../models/task.model";
import { fetchCanvasCourses, cleanCourseName } from "../services/canvas.service";
import {
  syncCanvasCoursesToDatabase,
  performFullSync,
} from "../services/sync.service";
import { config } from "../config/config";
import { getDateRange } from "../utils/date.utils";

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

export default router;
