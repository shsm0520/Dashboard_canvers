import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(__dirname, '../data/dashboard.db');
const dataDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
export const db = new sqlite3.Database(dbPath);

// Database schema
export const initializeDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          canvas_token TEXT,
          email TEXT,
          role TEXT DEFAULT 'user',
          join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Courses table
      db.run(`
        CREATE TABLE IF NOT EXISTS courses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          name TEXT NOT NULL,
          professor TEXT,
          credits INTEGER,
          canvas_course_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Tasks table
      db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          title TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL DEFAULT 'other',
          course TEXT,
          due_date DATE NOT NULL,
          due_time TEXT,
          priority TEXT NOT NULL DEFAULT 'medium',
          completed BOOLEAN DEFAULT FALSE,
          submitted BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Sync logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS sync_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          last_sync_at DATETIME NOT NULL,
          sync_type TEXT NOT NULL,
          status TEXT NOT NULL,
          assignments_count INTEGER DEFAULT 0,
          modules_count INTEGER DEFAULT 0,
          error_message TEXT,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Health status logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS health_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          status TEXT NOT NULL,
          message TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Migration: Add submitted column to tasks table if it doesn't exist
      db.all("PRAGMA table_info(tasks)", [], (err, columns: any[]) => {
        if (err) {
          console.error("Error checking tasks table:", err);
          reject(err);
          return;
        }

        const hasSubmittedColumn = columns.some((col) => col.name === "submitted");

        if (!hasSubmittedColumn) {
          console.log("Adding 'submitted' column to tasks table...");
          db.run("ALTER TABLE tasks ADD COLUMN submitted BOOLEAN DEFAULT FALSE", (alterErr) => {
            if (alterErr) {
              console.error("Error adding submitted column:", alterErr);
              reject(alterErr);
            } else {
              console.log("Successfully added 'submitted' column");
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });
  });
};

// Helper functions for database operations
export const runQuery = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

export const getQuery = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

export const getAllQuery = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Migration function from users.txt
export const migrateUsersFromFile = async (): Promise<void> => {
  const usersFilePath = path.join(__dirname, '../users.txt');

  if (!fs.existsSync(usersFilePath)) {
    console.log('No users.txt file found, skipping migration');
    return;
  }

  const usersContent = fs.readFileSync(usersFilePath, 'utf-8');
  const lines = usersContent.split('\n').filter(line => line.trim());

  for (const line of lines) {
    const [username, password, canvasToken] = line.split(':');

    if (username && password) {
      try {
        // Check if user already exists
        const existingUser = await getQuery(
          'SELECT id FROM users WHERE username = ?',
          [username]
        );

        if (!existingUser) {
          await runQuery(
            'INSERT INTO users (username, password, canvas_token, email, role) VALUES (?, ?, ?, ?, ?)',
            [
              username,
              password,
              canvasToken || null,
              `${username}@example.com`, // Default email
              username === 'admin' ? 'admin' : 'user'
            ]
          );
          console.log(`Migrated user: ${username}`);
        }
      } catch (error) {
        console.error(`Error migrating user ${username}:`, error);
      }
    }
  }

  console.log('User migration completed');
};

// Close database connection
export const closeDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};