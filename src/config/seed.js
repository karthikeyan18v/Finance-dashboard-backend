require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("./db");

const ADMIN_NAME     = process.env.ADMIN_NAME     || "Super Admin";
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || "admin@finance.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@1234";

async function seed() {
  await connectDB();

  // Bypass the soft-delete pre-hook so we can check for any existing admin
  const User = require("../models/User");
  const existing = await User.findOne({ email: ADMIN_EMAIL }).setOptions({ bypassQueryMiddleware: true });

  if (existing) {
    console.log(`Admin already exists: ${ADMIN_EMAIL}`);
    await mongoose.disconnect();
    return;
  }

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await User.create({
    name:     ADMIN_NAME,
    email:    ADMIN_EMAIL,
    password: hashed,
    role:     "admin",
    isActive: true,
  });

  console.log("✔ Default admin created");
  console.log(`  Email   : ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log("  Change the password after first login!");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
