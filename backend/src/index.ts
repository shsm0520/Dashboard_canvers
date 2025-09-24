import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { initializeDatabase, runQuery, getQuery, getAllQuery, migrateUsersFromFile, closeDatabase } from './database';

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

// Database helper functions
const getUserByUsername = async (username: string): Promise<User | null> => {
  return await getQuery('SELECT * FROM users WHERE username = ?', [username]);
};

const getUserById = async (id: number): Promise<User | null> => {
  return await getQuery('SELECT * FROM users WHERE id = ?', [id]);
};

const updateUserCanvasToken = async (userId: number, canvasToken: string | null): Promise<boolean> => {
  try {
    await runQuery(
      'UPDATE users SET canvas_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [canvasToken, userId]
    );
    return true;
  } catch (error) {
    console.error('Error updating canvas token:', error);
    return false;
  }
};

const getUserCourses = async (userId: number): Promise<Course[]> => {
  return await getAllQuery('SELECT * FROM courses WHERE user_id = ?', [userId]);
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
        canvasTokenPreview: user.canvas_token ?
          user.canvas_token.substring(0, 10) + '...' : null
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

  try {
    const user = await getUserByUsername(username);

    if (user && user.password === password) {
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
        joinDate: user.join_date?.split('T')[0] || "2024-01-01",
        role: user.role,
        hasCanvasToken: !!user.canvas_token,
        canvasTokenPreview: user.canvas_token ?
          user.canvas_token.substring(0, 10) + '...' : null
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

  if (!canvasToken || typeof canvasToken !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Canvas token is required and must be a string'
    });
  }

  if (canvasToken.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Canvas token appears to be invalid (too short)'
    });
  }

  try {
    const user = await getUserByUsername(req.user!.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const success = await updateUserCanvasToken(user.id, canvasToken.trim());

    if (success) {
      res.json({
        success: true,
        message: 'Canvas token updated successfully',
        canvasTokenPreview: canvasToken.substring(0, 10) + '...'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to save Canvas token'
      });
    }
  } catch (error) {
    console.error("Error updating canvas token:", error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
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
        message: 'User not found'
      });
    }

    const success = await updateUserCanvasToken(user.id, null);

    if (success) {
      res.json({
        success: true,
        message: 'Canvas token removed successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to remove Canvas token'
      });
    }
  } catch (error) {
    console.error("Error removing canvas token:", error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
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

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');

    // Migrate existing users from file
    await migrateUsersFromFile();

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
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  try {
    await closeDatabase();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  try {
    await closeDatabase();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database:', error);
  }
  process.exit(0);
});

startServer();