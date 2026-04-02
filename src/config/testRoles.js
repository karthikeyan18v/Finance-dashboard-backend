require("dotenv").config();
const http = require("http");
const connectDB = require("./db");
const mongoose = require("mongoose");
const app = require("../../app");

const V1 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5Y2UxYzlmZjJlZGNjZDE0MjA0Y2MzNCIsInJvbGUiOiJ2aWV3ZXIiLCJpYXQiOjE3NzUxMTU0MjQsImV4cCI6MTc3NTcyMDIyNH0._7y3RS_e91ptoAVnHzlMdalDO5LAfSpro0stfCeUBak";
const V2 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5Y2UxY2EwZjJlZGNjZDE0MjA0Y2MzNiIsInJvbGUiOiJ2aWV3ZXIiLCJpYXQiOjE3NzUxMTU0MjQsImV4cCI6MTc3NTcyMDIyNH0.A217fmV1vLF1oyO0xyv-tHu8WVJaiYiEzOVhKq0nZes";
const AN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5Y2UxY2EwZjJlZGNjZDE0MjA0Y2MzOCIsInJvbGUiOiJhbmFseXN0IiwiaWF0IjoxNzc1MTE1NDI0LCJleHAiOjE3NzU3MjAyMjR9.zOToa-Ladctcjead9lFynlfH775vEc_YA7PZp8rxuJs";

const PORT = 5099;

function get(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "localhost", port: PORT, path, method: "GET",
        headers: { Authorization: `Bearer ${token}` } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

function pass(label) { console.log(`  ✔  ${label}`); }
function fail(label, got, want) { console.log(`  ✗  ${label} — got ${got}, expected ${want}`); }
function check(label, got, want) { got === want ? pass(label) : fail(label, got, want); }

async function run() {
  await connectDB();
  const server = http.createServer(app).listen(PORT);
  await new Promise((r) => server.once("listening", r));

  console.log("\n══════════════════════════════════════════");
  console.log(" RECORDS — role-based visibility");
  console.log("══════════════════════════════════════════");

  const r1 = await get("/records", V1);
  check("Viewer One  sees only own 5 records",  r1.body.pagination.total, 5);

  const r2 = await get("/records", V2);
  check("Viewer Two  sees only own 4 records",  r2.body.pagination.total, 4);

  const ra = await get("/records", AN);
  check("Analyst     sees all   12 records",    ra.body.pagination.total, 12);

  console.log("\n══════════════════════════════════════════");
  console.log(" DASHBOARD SUMMARY");
  console.log("══════════════════════════════════════════");

  const s1 = await get("/dashboard/summary", V1);
  console.log(`  Viewer One  → income: ${s1.body.totalIncome}, expense: ${s1.body.totalExpense}, net: ${s1.body.netBalance}, records: ${s1.body.totalRecords}`);
  check("Viewer One  sees only own 5 records in summary", s1.body.totalRecords, 5);

  const s2 = await get("/dashboard/summary", V2);
  console.log(`  Viewer Two  → income: ${s2.body.totalIncome}, expense: ${s2.body.totalExpense}, net: ${s2.body.netBalance}, records: ${s2.body.totalRecords}`);
  check("Viewer Two  sees only own 4 records in summary", s2.body.totalRecords, 4);

  const sa = await get("/dashboard/summary", AN);
  console.log(`  Analyst     → income: ${sa.body.totalIncome}, expense: ${sa.body.totalExpense}, net: ${sa.body.netBalance}, records: ${sa.body.totalRecords}`);
  check("Analyst     sees all  12 records in summary",    sa.body.totalRecords, 12);

  console.log("\n══════════════════════════════════════════");
  console.log(" DASHBOARD CATEGORIES");
  console.log("══════════════════════════════════════════");

  const c1 = await get("/dashboard/categories", V1);
  console.log(`  Viewer One  categories: ${c1.body.categories.map(c => c._id).join(", ")}`);

  const c2 = await get("/dashboard/categories", V2);
  console.log(`  Viewer Two  categories: ${c2.body.categories.map(c => c._id).join(", ")}`);

  const ca = await get("/dashboard/categories", AN);
  console.log(`  Analyst     categories: ${ca.body.categories.map(c => c._id).join(", ")}`);
  check("Analyst sees more categories than any single viewer",
    ca.body.categories.length >= c1.body.categories.length, true);

  console.log("\n══════════════════════════════════════════");
  console.log(" DASHBOARD RECENT ACTIVITY");
  console.log("══════════════════════════════════════════");

  const rec1 = await get("/dashboard/recent?limit=10", V1);
  console.log(`  Viewer One  recent records: ${rec1.body.records.length}`);
  check("Viewer One  recent scoped to own records", rec1.body.records.length, 5);

  const reca = await get("/dashboard/recent?limit=10", AN);
  console.log(`  Analyst     recent records: ${reca.body.records.length}`);
  check("Analyst     recent shows all records",     reca.body.records.length, 10); // limited by ?limit=10

  console.log("\n══════════════════════════════════════════");
  console.log(" DASHBOARD TRENDS (2024)");
  console.log("══════════════════════════════════════════");

  const t1 = await get("/dashboard/trends?year=2024&groupBy=month", V1);
  console.log(`  Viewer One  months with data: ${t1.body.trends.map(t => `month ${t.period}`).join(", ")}`);

  const ta = await get("/dashboard/trends?year=2024&groupBy=month", AN);
  console.log(`  Analyst     months with data: ${ta.body.trends.map(t => `month ${t.period}`).join(", ")}`);

  console.log("\n══════════════════════════════════════════");
  console.log(" ACCESS CONTROL — viewer cannot create records");
  console.log("══════════════════════════════════════════");

  const blocked = await new Promise((resolve, reject) => {
    const body = JSON.stringify({ amount: 100, type: "expense", category: "Test", date: "2024-01-01" });
    const req = http.request(
      { hostname: "localhost", port: PORT, path: "/records", method: "POST",
        headers: { Authorization: `Bearer ${V1}`, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
  check("Viewer POST /records blocked with 403", blocked.status, 403);
  console.log(`  Response: ${JSON.stringify(blocked.body)}`);

  console.log("\n══════════════════════════════════════════\n");
  server.close();
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err.message); process.exit(1); });
