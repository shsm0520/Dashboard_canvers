import { getAllQuery, getQuery, runQuery } from "../database";
import { Task } from "../types";

export const getUserTasks = async (
  userId: number,
  startDate?: string,
  endDate?: string
): Promise<Task[]> => {
  let query = "SELECT * FROM tasks WHERE user_id = ?";
  const params: any[] = [userId];

  if (startDate && endDate) {
    query += " AND due_date BETWEEN ? AND ?";
    params.push(startDate, endDate);
  }

  query += " ORDER BY due_date ASC, due_time ASC";
  return await getAllQuery(query, params);
};

export const createTask = async (
  task: Omit<Task, "id" | "created_at" | "updated_at">
): Promise<number> => {
  const result = await runQuery(
    "INSERT INTO tasks (user_id, title, description, type, course, due_date, due_time, priority, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      task.user_id,
      task.title,
      task.description,
      task.type,
      task.course,
      task.due_date,
      task.due_time,
      task.priority,
      task.completed,
    ]
  );
  return result.id;
};

export const updateTask = async (
  taskId: number,
  userId: number,
  updates: Partial<Task>
): Promise<boolean> => {
  try {
    const setClauses = [];
    const params = [];

    if (updates.title !== undefined) {
      setClauses.push("title = ?");
      params.push(updates.title);
    }
    if (updates.description !== undefined) {
      setClauses.push("description = ?");
      params.push(updates.description);
    }
    if (updates.type !== undefined) {
      setClauses.push("type = ?");
      params.push(updates.type);
    }
    if (updates.course !== undefined) {
      setClauses.push("course = ?");
      params.push(updates.course);
    }
    if (updates.due_date !== undefined) {
      setClauses.push("due_date = ?");
      params.push(updates.due_date);
    }
    if (updates.due_time !== undefined) {
      setClauses.push("due_time = ?");
      params.push(updates.due_time);
    }
    if (updates.priority !== undefined) {
      setClauses.push("priority = ?");
      params.push(updates.priority);
    }
    if (updates.completed !== undefined) {
      setClauses.push("completed = ?");
      params.push(updates.completed);
    }

    if (setClauses.length === 0) {
      return false;
    }

    setClauses.push("updated_at = CURRENT_TIMESTAMP");
    params.push(taskId, userId);

    const query = `UPDATE tasks SET ${setClauses.join(
      ", "
    )} WHERE id = ? AND user_id = ?`;
    const result = await runQuery(query, params);
    return result.changes > 0;
  } catch (error) {
    console.error("Error updating task:", error);
    return false;
  }
};

export const deleteTask = async (
  taskId: number,
  userId: number
): Promise<boolean> => {
  try {
    const result = await runQuery(
      "DELETE FROM tasks WHERE id = ? AND user_id = ?",
      [taskId, userId]
    );
    return result.changes > 0;
  } catch (error) {
    console.error("Error deleting task:", error);
    return false;
  }
};

export const getTaskByUserAndTitle = async (
  userId: number,
  title: string,
  course: string
): Promise<{ id: number; due_date: string } | null> => {
  return await getQuery(
    "SELECT id, due_date FROM tasks WHERE user_id = ? AND title = ? AND course = ?",
    [userId, title, course]
  );
};

export const deleteAllUserTasks = async (userId: number): Promise<void> => {
  await runQuery("DELETE FROM tasks WHERE user_id = ?", [userId]);
};

export const getTaskById = async (taskId: number): Promise<Task | null> => {
  return await getQuery("SELECT * FROM tasks WHERE id = ?", [taskId]);
};
