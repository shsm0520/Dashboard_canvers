import express from "express";
import cors from "cors";
import { config } from "./config/config";
import {
  initializeDatabase,
  migrateUsersFromFile,
  closeDatabase,
} from "./database";
import { startScheduler } from "./services/scheduler.service";

// Import routes
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import courseRoutes from "./routes/course.routes";
import taskRoutes from "./routes/task.routes";
import analyticsRoutes from "./routes/analytics.routes";

const app = express();

// Middleware
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    message: "Backend server is running!",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Public announcements endpoint
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

// API routes
app.use("/api", authRoutes);
app.use("/api", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/analytics", analyticsRoutes);

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    console.log("Database initialized successfully");

    // Migrate existing users from file
    await migrateUsersFromFile();

    // Start background sync scheduler
    startScheduler();

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log("JWT Secret:", config.jwtSecret.substring(0, 20) + "...");
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
const shutdown = async () => {
  console.log("Shutting down gracefully...");
  try {
    await closeDatabase();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error closing database:", error);
  }
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startServer();
