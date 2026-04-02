const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
  getSummary,
  getCategoryTotals,
  getRecentActivity,
  getTrends,
} = require("../controllers/dashboardController");

// All dashboard routes require authentication (all roles allowed)
router.use(auth, authorize("viewer", "analyst", "admin"));

// GET /dashboard/summary
router.get("/summary", getSummary);

// GET /dashboard/categories
router.get("/categories", getCategoryTotals);

// GET /dashboard/recent?limit=5
router.get("/recent", getRecentActivity);

// GET /dashboard/trends?year=2024&groupBy=month
router.get("/trends", getTrends);

module.exports = router;
