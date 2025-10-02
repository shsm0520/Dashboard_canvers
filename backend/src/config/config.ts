import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || "dashboard-jwt-secret-key-change-in-production",
  corsOrigin: "http://localhost:5173",
  canvasApiUrl: "https://uc.instructure.com/api/v1",
  sync: {
    intervalHours: 3,
    cacheHours: 1,
    dateRangeMonthsBefore: 2,
    dateRangeMonthsAfter: 3,
  },
};
