import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { getUserByUsername, updateUserCanvasToken } from "../models/user.model";

const router = Router();

router.get("/me", authenticateToken, async (req, res) => {
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

router.get("/profile", authenticateToken, async (req, res) => {
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

router.put("/canvas-token", authenticateToken, async (req, res) => {
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

router.delete("/canvas-token", authenticateToken, async (req, res) => {
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

export default router;
