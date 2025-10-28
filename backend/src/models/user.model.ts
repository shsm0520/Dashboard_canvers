import { getQuery, runQuery } from "../database";
import { User } from "../types";

export const getUserByUsername = async (username: string): Promise<User | null> => {
  return await getQuery("SELECT * FROM users WHERE username = ?", [username]);
};

export const getUserById = async (id: number): Promise<User | null> => {
  return await getQuery("SELECT * FROM users WHERE id = ?", [id]);
};

export const updateUserCanvasToken = async (
  userId: number,
  canvasToken: string | null
): Promise<boolean> => {
  try {
    await runQuery(
      "UPDATE users SET canvas_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [canvasToken, userId]
    );
    return true;
  } catch (error) {
    console.error("Error updating canvas token:", error);
    return false;
  }
};
