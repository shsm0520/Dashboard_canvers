import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";

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

// User data structure
interface UserData {
  password: string;
  canvasToken?: string;
}

// Simple user authentication using text file
const loadUsers = (): Record<string, UserData> => {
  try {
    const usersFile = path.join(__dirname, "..", "users.txt");
    const data = fs.readFileSync(usersFile, "utf8");
    const users: Record<string, UserData> = {};
    data.split("\n").forEach((line) => {
      if (line.trim()) {
        const parts = line.trim().split(":");
        const [username, password, canvasToken] = parts;
        users[username] = {
          password,
          canvasToken: canvasToken || undefined
        };
      }
    });
    return users;
  } catch (error) {
    console.error("Error loading users file:", error);
    return {};
  }
};

// Save users to file
const saveUsers = (users: Record<string, UserData>) => {
  try {
    const usersFile = path.join(__dirname, "..", "users.txt");
    const data = Object.entries(users)
      .map(([username, userData]) => `${username}:${userData.password}:${userData.canvasToken || ''}`)
      .join('\n');
    fs.writeFileSync(usersFile, data, 'utf8');
    return true;
  } catch (error) {
    console.error("Error saving users file:", error);
    return false;
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

app.get("/api/me", authenticateToken, (req, res) => {
  const users = loadUsers();
  const userData = users[req.user!.userId];

  res.json({
    user: {
      username: req.user!.userId,
      hasCanvasToken: !!userData?.canvasToken,
      canvasTokenPreview: userData?.canvasToken ?
        userData.canvasToken.substring(0, 10) + '...' : null
    },
    authenticated: true,
  });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();

  if (users[username] && users[username].password === password) {
    // Generate JWT token
    const token = jwt.sign({ userId: username }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      success: true,
      message: "Login successful",
      user: { username },
      token,
    });
  } else {
    res.status(401).json({
      success: false,
      message: "Invalid username or password",
    });
  }
});

app.post("/api/logout", (req, res) => {
  // With JWT, logout is handled on client side by removing token
  // Optionally, you could maintain a blacklist of tokens
  res.json({ success: true, message: "Logged out successfully" });
});

// Protected API endpoints - require JWT token
app.get("/api/courses", authenticateToken, (req, res) => {
  res.json({
    courses: [],
    user: req.user!.userId,
  });
});

app.get("/api/profile", authenticateToken, (req, res) => {
  const users = loadUsers();
  const userData = users[req.user!.userId];

  res.json({
    profile: {
      username: req.user!.userId,
      email: `${req.user!.userId}@example.com`,
      joinDate: "2024-01-01",
      role: "student",
      hasCanvasToken: !!userData?.canvasToken,
      canvasTokenPreview: userData?.canvasToken ?
        userData.canvasToken.substring(0, 10) + '...' : null
    },
  });
});

// Update Canvas token endpoint
app.put("/api/canvas-token", authenticateToken, (req, res) => {
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

  const users = loadUsers();
  const username = req.user!.userId;

  if (!users[username]) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Update user's Canvas token
  users[username].canvasToken = canvasToken.trim();

  if (saveUsers(users)) {
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
});

// Delete Canvas token endpoint
app.delete("/api/canvas-token", authenticateToken, (req, res) => {
  const users = loadUsers();
  const username = req.user!.userId;

  if (!users[username]) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Remove user's Canvas token
  users[username].canvasToken = undefined;

  if (saveUsers(users)) {
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("JWT Secret:", JWT_SECRET.substring(0, 20) + "...");
  console.log(
    "Protected endpoints: /api/me, /api/courses, /api/profile, /api/analytics"
  );
  console.log(
    "Public endpoints: /api/health, /api/login, /api/logout, /api/public/*"
  );
});
