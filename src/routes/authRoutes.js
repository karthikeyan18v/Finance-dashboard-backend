const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const validate = require("../middleware/validateMiddleware");
const auth = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const { register, login, createUser } = require("../controllers/authController");

const passwordRules = body("password")
  .isLength({ min: 6 })
  .withMessage("Password must be at least 6 characters");

// POST /auth/register — public self-signup (always viewer)
router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    passwordRules,
  ],
  validate,
  register
);

// POST /auth/login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  login
);

// POST /auth/users — admin creates a user with a specific role
router.post(
  "/users",
  auth,
  authorize("admin"),
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    passwordRules,
    body("role")
      .isIn(["viewer", "analyst", "admin"])
      .withMessage("Role must be viewer, analyst, or admin"),
  ],
  validate,
  createUser
);

module.exports = router;
