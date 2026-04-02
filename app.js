const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./src/middleware/errorMiddleware");

const app = express();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Rate limiting — 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later" },
});
app.use(limiter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/auth", require("./src/routes/authRoutes"));
app.use("/users", require("./src/routes/userRoutes"));
app.use("/records", require("./src/routes/recordRoutes"));
app.use("/dashboard", require("./src/routes/dashboardRoutes"));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
