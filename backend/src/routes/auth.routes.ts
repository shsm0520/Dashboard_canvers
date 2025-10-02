import { Router } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/config";
import { getUserByUsername } from "../models/user.model";
import { shouldSyncUser, logSync } from "../models/sync.model";
import { performFullSync } from "../services/sync.service";

const router = Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const clientTimezone = req.headers["x-client-timezone"] as string;
  const clientOffset = req.headers["x-client-timezone-offset"]
    ? parseInt(req.headers["x-client-timezone-offset"] as string)
    : undefined;

  try {
    const user = await getUserByUsername(username);

    if (user && user.password === password) {
      // Smart sync: only sync if needed (more than 1 hour since last sync)
      if (user.canvas_token) {
        const needsSync = await shouldSyncUser(user.id);

        if (needsSync) {
          console.log(
            `🔄 User ${username} needs sync (last sync > 1 hour ago)`
          );
          try {
            const result = await performFullSync(
              user.id,
              user.canvas_token,
              clientTimezone,
              clientOffset
            );

            console.log(
              `Auto-synced ${result.courses} Canvas courses for ${username}`
            );
            console.log(
              `\n✅ Auto-synced ${result.assignments} total assignments/quizzes for ${username}`
            );

            // Log successful sync
            await logSync(user.id, "login", "success", result.assignments, 0);
          } catch (error) {
            console.warn(
              `Failed to auto-sync Canvas data for ${username}:`,
              error
            );
            await logSync(
              user.id,
              "login",
              "failed",
              0,
              0,
              error instanceof Error ? error.message : "Unknown error"
            );
            // Continue with login even if Canvas sync fails
          }
        } else {
          console.log(`✅ User ${username} recently synced, using cached data`);
        }
      }

      // Generate JWT token
      const token = jwt.sign({ userId: username }, config.jwtSecret, {
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

router.post("/logout", (req, res) => {
  // With JWT, logout is handled on client side by removing token
  // Optionally, you could maintain a blacklist of tokens
  res.json({ success: true, message: "Logged out successfully" });
});

export default router;
