require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const connectDB = require("./db");
const User = require("../models/User");
const Record = require("../models/Record");

async function seedTestData() {
  await connectDB();

  // ── Wipe existing test data ──────────────────────────────────────────────
  await User.deleteMany({ email: { $in: [
    "viewer1@test.com", "viewer2@test.com", "analyst1@test.com"
  ]}});

  // ── Create test users ────────────────────────────────────────────────────
  const hash = (p) => bcrypt.hash(p, 10);

  const [viewer1, viewer2, analyst] = await Promise.all([
    User.create({ name: "Viewer One",   email: "viewer1@test.com",  password: await hash("pass123"), role: "viewer"  }),
    User.create({ name: "Viewer Two",   email: "viewer2@test.com",  password: await hash("pass123"), role: "viewer"  }),
    User.create({ name: "Analyst One",  email: "analyst1@test.com", password: await hash("pass123"), role: "analyst" }),
  ]);

  // ── Wipe existing records for these users ────────────────────────────────
  await Record.deleteMany({ createdBy: { $in: [viewer1._id, viewer2._id, analyst._id] } });

  // ── Create records for Viewer One ────────────────────────────────────────
  await Record.insertMany([
    { amount: 5000, type: "income",  category: "Salary",    date: new Date("2024-01-01"), notes: "Jan salary",       createdBy: viewer1._id },
    { amount: 1200, type: "expense", category: "Rent",      date: new Date("2024-01-05"), notes: "Jan rent",         createdBy: viewer1._id },
    { amount: 300,  type: "expense", category: "Groceries", date: new Date("2024-01-10"), notes: "Weekly groceries", createdBy: viewer1._id },
    { amount: 5000, type: "income",  category: "Salary",    date: new Date("2024-02-01"), notes: "Feb salary",       createdBy: viewer1._id },
    { amount: 500,  type: "expense", category: "Utilities", date: new Date("2024-02-08"), notes: "Electric bill",    createdBy: viewer1._id },
  ]);

  // ── Create records for Viewer Two ────────────────────────────────────────
  await Record.insertMany([
    { amount: 3500, type: "income",  category: "Salary",    date: new Date("2024-01-01"), notes: "Jan salary",    createdBy: viewer2._id },
    { amount: 900,  type: "expense", category: "Rent",      date: new Date("2024-01-04"), notes: "Jan rent",      createdBy: viewer2._id },
    { amount: 2000, type: "income",  category: "Freelance", date: new Date("2024-01-20"), notes: "Design project", createdBy: viewer2._id },
    { amount: 400,  type: "expense", category: "Transport", date: new Date("2024-02-03"), notes: "Monthly pass",   createdBy: viewer2._id },
  ]);

  // ── Create records for Analyst ───────────────────────────────────────────
  await Record.insertMany([
    { amount: 7000, type: "income",  category: "Salary",    date: new Date("2024-01-01"), notes: "Jan salary",      createdBy: analyst._id },
    { amount: 200,  type: "expense", category: "Groceries", date: new Date("2024-01-12"), notes: "Weekly groceries", createdBy: analyst._id },
    { amount: 1500, type: "income",  category: "Freelance", date: new Date("2024-02-15"), notes: "Consulting fee",   createdBy: analyst._id },
  ]);

  // ── Generate tokens ──────────────────────────────────────────────────────
  const sign = (user) =>
    jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

  console.log("\n✔ Test data seeded successfully\n");
  console.log("──────────────────────────────────────────────────────────────");
  console.log("USER TOKENS (copy these for curl tests)");
  console.log("──────────────────────────────────────────────────────────────");
  console.log(`\nViewer One  (viewer1@test.com)\n  ID    : ${viewer1._id}\n  TOKEN : ${sign(viewer1)}`);
  console.log(`\nViewer Two  (viewer2@test.com)\n  ID    : ${viewer2._id}\n  TOKEN : ${sign(viewer2)}`);
  console.log(`\nAnalyst One (analyst1@test.com)\n  ID    : ${analyst._id}\n  TOKEN : ${sign(analyst)}`);
  console.log("\n──────────────────────────────────────────────────────────────");
  console.log("Records created:");
  console.log("  Viewer One  → 5 records (2 income, 3 expense)");
  console.log("  Viewer Two  → 4 records (2 income, 2 expense)");
  console.log("  Analyst One → 3 records (2 income, 1 expense)");
  console.log("  Total       → 12 records across all users");
  console.log("──────────────────────────────────────────────────────────────\n");

  await mongoose.disconnect();
}

seedTestData().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
