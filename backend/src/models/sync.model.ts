import { getAllQuery, getQuery, runQuery } from "../database";

export const shouldSyncUser = async (userId: number): Promise<boolean> => {
  try {
    const lastSync = await getQuery(
      "SELECT last_sync_at FROM sync_logs WHERE user_id = ? AND status = 'success' ORDER BY last_sync_at DESC LIMIT 1",
      [userId]
    );

    if (!lastSync) {
      return true; // Never synced, need to sync
    }

    const now = new Date();
    const lastSyncTime = new Date(lastSync.last_sync_at);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Sync if last sync was more than 1 hour ago
    return lastSyncTime < oneHourAgo;
  } catch (error) {
    console.error("Error checking sync status:", error);
    return true; // On error, sync to be safe
  }
};

export const logSync = async (
  userId: number,
  syncType: string,
  status: string,
  assignmentsCount: number = 0,
  modulesCount: number = 0,
  errorMessage?: string
): Promise<void> => {
  try {
    await runQuery(
      "INSERT INTO sync_logs (user_id, last_sync_at, sync_type, status, assignments_count, modules_count, error_message) VALUES (?, NOW(), ?, ?, ?, ?, ?)",
      [
        userId,
        syncType,
        status,
        assignmentsCount,
        modulesCount,
        errorMessage || null,
      ]
    );
  } catch (error) {
    console.error("Error logging sync:", error);
  }
};

export const getActiveUsers = async () => {
  return await getAllQuery(`
    SELECT DISTINCT u.id, u.username, u.canvas_token
    FROM users u
    LEFT JOIN sync_logs s ON u.id = s.user_id
    WHERE u.canvas_token IS NOT NULL
    AND (
      s.last_sync_at > datetime('now', '-7 days')
      OR s.last_sync_at IS NULL
    )
  `);
};
