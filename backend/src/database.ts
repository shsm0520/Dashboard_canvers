import mysql from "mysql2/promise";
import { config } from "./config/config";
import path from "path";
import fs from "fs";

// Create connection pool
export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Test database connection
export const testConnection = async (): Promise<void> => {
  try {
    const connection = await pool.getConnection();
    console.log("Database connection established successfully");
    connection.release();
  } catch (error) {
    console.error("Error connecting to database:", error);
    throw error;
  }
};

// Database schema initialization
export const initializeDatabase = async (): Promise<void> => {
  try {
    await testConnection();

    // Tables are already created by init.sql in docker-compose
    // We just need to verify the connection works
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

// Helper functions for database operations
export const runQuery = async (
  sql: string,
  params: any[] = []
): Promise<any> => {
  const [result] = await pool.execute(sql, params);
  return result;
};

export const getQuery = async (
  sql: string,
  params: any[] = []
): Promise<any> => {
  const [rows]: any = await pool.execute(sql, params);
  return rows[0];
};

export const getAllQuery = async (
  sql: string,
  params: any[] = []
): Promise<any[]> => {
  const [rows]: any = await pool.execute(sql, params);
  return rows;
};

// Migration function from users.txt
export const migrateUsersFromFile = async (): Promise<void> => {
  const usersFilePath = path.join(__dirname, "../users.txt");

  if (!fs.existsSync(usersFilePath)) {
    console.log("No users.txt file found, skipping migration");
    return;
  }

  const usersContent = fs.readFileSync(usersFilePath, "utf-8");
  const lines = usersContent.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    const [username, password, canvasToken] = line.split(":");

    if (username && password) {
      try {
        // Check if user already exists
        const existingUser = await getQuery(
          "SELECT id FROM users WHERE username = ?",
          [username]
        );

        if (!existingUser) {
          await runQuery(
            "INSERT INTO users (username, password, canvas_token, email, role) VALUES (?, ?, ?, ?, ?)",
            [
              username,
              password,
              canvasToken || null,
              `${username}@example.com`, // Default email
              username === "admin" ? "admin" : "user",
            ]
          );
          console.log(`Migrated user: ${username}`);
        }
      } catch (error) {
        console.error(`Error migrating user ${username}:`, error);
      }
    }
  }

  console.log("User migration completed");
};

// Close database connection pool
export const closeDatabase = async (): Promise<void> => {
  try {
    await pool.end();
    console.log("Database connection pool closed");
  } catch (error) {
    console.error("Error closing database connection pool:", error);
    throw error;
  }
};

// For backward compatibility
export const db = pool;
