require("dotenv").config();
const app = require("../app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

// Listen first so Render detects the port, then connect DB
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

connectDB().catch((err) => {
  console.error("DB connection failed:", err.message);
  server.close(() => process.exit(1));
});
