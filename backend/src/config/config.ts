import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret:
    process.env.JWT_SECRET || "dashboard-jwt-secret-key-change-in-production",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  canvasApiUrl:
    process.env.CANVAS_API_URL || "https://uc.instructure.com/api/v1",
  db: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "dashboard_user",
    password: process.env.DB_PASSWORD || "dashboard_password",
    database: process.env.DB_NAME || "dashboard_db",
  },
  sync: {
    intervalHours: 3,
    cacheHours: 1,
    dateRangeMonthsBefore: 2,
    dateRangeMonthsAfter: 3,
  },
};
