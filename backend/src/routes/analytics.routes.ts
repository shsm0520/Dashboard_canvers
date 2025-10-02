import { Router } from "express";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, (req, res) => {
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

export default router;
