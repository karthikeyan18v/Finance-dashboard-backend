const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validate = require("../middleware/validateMiddleware");
const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
  createRecord,
  getRecords,
  getRecordById,
  updateRecord,
  deleteRecord,
} = require("../controllers/recordController");

// All record routes require authentication
router.use(auth);

// GET /records — viewer (own), analyst/admin (all)
router.get("/", authorize("viewer", "analyst", "admin"), getRecords);

// GET /records/:id — viewer (own), analyst/admin (all)
router.get(
  "/:id",
  authorize("viewer", "analyst", "admin"),
  [param("id").isMongoId().withMessage("Invalid record ID")],
  validate,
  getRecordById
);

// POST /records — admin only
router.post(
  "/",
  authorize("admin"),
  [
    body("amount").isFloat({ min: 0 }).withMessage("Amount must be a non-negative number"),
    body("type").isIn(["income", "expense"]).withMessage("Type must be income or expense"),
    body("category").notEmpty().withMessage("Category is required"),
    body("date").isISO8601().withMessage("Date must be a valid ISO 8601 date"),
    body("notes").optional().isString(),
    body("userId").optional().isMongoId().withMessage("userId must be a valid user ID"),
  ],
  validate,
  createRecord
);

// PUT /records/:id — admin only
router.put(
  "/:id",
  authorize("admin"),
  [
    param("id").isMongoId().withMessage("Invalid record ID"),
    body("amount").optional().isFloat({ min: 0 }).withMessage("Amount must be a non-negative number"),
    body("type").optional().isIn(["income", "expense"]).withMessage("Type must be income or expense"),
    body("date").optional().isISO8601().withMessage("Date must be a valid ISO 8601 date"),
    body("notes").optional().isString(),
  ],
  validate,
  updateRecord
);

// DELETE /records/:id — admin only (soft delete)
router.delete(
  "/:id",
  authorize("admin"),
  [param("id").isMongoId().withMessage("Invalid record ID")],
  validate,
  deleteRecord
);

module.exports = router;
