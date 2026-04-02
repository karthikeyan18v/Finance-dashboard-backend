const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validate = require("../middleware/validateMiddleware");
const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
  getUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser,
} = require("../controllers/userController");

// All user management routes are admin-only
router.use(auth, authorize("admin"));

// GET /users
router.get("/", getUsers);

// GET /users/:id
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid user ID")],
  validate,
  getUserById
);

// PUT /users/:id
router.put(
  "/:id",
  [
    param("id").isMongoId().withMessage("Invalid user ID"),
    body("email").optional().isEmail().withMessage("Valid email is required"),
    body("role")
      .optional()
      .isIn(["viewer", "analyst", "admin"])
      .withMessage("Role must be viewer, analyst, or admin"),
  ],
  validate,
  updateUser
);

// PATCH /users/:id/status
router.patch(
  "/:id/status",
  [param("id").isMongoId().withMessage("Invalid user ID")],
  validate,
  toggleUserStatus
);

// DELETE /users/:id (soft delete)
router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid user ID")],
  validate,
  deleteUser
);

module.exports = router;
