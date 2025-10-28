import cron from "node-cron";
import { getActiveUsers, shouldSyncUser, logSync } from "../models/sync.model";
import { fetchCanvasCourses, cleanCourseName } from "./canvas.service";
import {
  syncCanvasCoursesToDatabase,
  syncCanvasAssignmentsToTasks,
} from "./sync.service";
import { fetchCanvasAssignments } from "./canvas.service";

export const syncAllActiveUsers = async () => {
  console.log("\n🔄 === Background Sync Started ===");

  try {
    const activeUsers = await getActiveUsers();

    console.log(`Found ${activeUsers.length} active users to sync`);

    let syncedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const user of activeUsers) {
      try {
        // Check if user needs sync (more than 1 hour ago)
        const needsSync = await shouldSyncUser(user.id);

        if (!needsSync) {
          skippedCount++;
          console.log(`⏭️  Skipped ${user.username} (recently synced)`);
          continue;
        }

        console.log(`🔄 Syncing ${user.username}...`);

        // Sync courses
        const canvasCourses = await fetchCanvasCourses(user.canvas_token);
        await syncCanvasCoursesToDatabase(user.id, canvasCourses);

        // Sync assignments (includes LTI quizzes)
        let totalAssignments = 0;

        for (const course of canvasCourses) {
          const courseName = cleanCourseName(course.shortName, course.longName);

          const assignments = await fetchCanvasAssignments(
            user.canvas_token,
            course.id
          );
          await syncCanvasAssignmentsToTasks(
            user.id,
            assignments,
            courseName,
            undefined,
            undefined
          );
          totalAssignments += assignments.length;

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        await logSync(user.id, "background", "success", totalAssignments, 0);
        syncedCount++;
        console.log(
          `✅ Synced ${user.username}: ${totalAssignments} assignments/quizzes`
        );
      } catch (error) {
        failedCount++;
        console.error(`❌ Failed to sync ${user.username}:`, error);
        await logSync(
          user.id,
          "background",
          "failed",
          0,
          0,
          error instanceof Error ? error.message : "Unknown error"
        );
      }
    }

    console.log(`\n✅ === Background Sync Complete ===`);
    console.log(
      `   Synced: ${syncedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}\n`
    );
  } catch (error) {
    console.error("❌ Background sync error:", error);
  }
};

export const startScheduler = () => {
  // Start background sync scheduler (every 3 hours)
  cron.schedule("0 */3 * * *", syncAllActiveUsers);
  console.log("⏰ Background sync scheduler started (every 3 hours)");
};
