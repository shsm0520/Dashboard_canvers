import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { getUserByUsername } from "../models/user.model";
import {
  getUserTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../models/task.model";

const router = Router();

router.get("/", authenticateToken, async (req, res) => {
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

router.post("/", authenticateToken, async (req, res) => {
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
      submitted: false,
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

router.put("/:id", authenticateToken, async (req, res) => {
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

router.delete("/:id", authenticateToken, async (req, res) => {
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

export default router;
