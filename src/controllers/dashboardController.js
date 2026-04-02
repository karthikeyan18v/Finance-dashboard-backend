const mongoose = require("mongoose");
const Record = require("../models/Record");

// For find() queries — Mongoose auto-casts the string ID to ObjectId
const baseFilter = (user) =>
  user.role === "viewer" ? { createdBy: user.id } : {};

// For aggregation $match — must explicitly cast to ObjectId (no auto-cast)
const baseMatchStage = (user) =>
  user.role === "viewer"
    ? { createdBy: new mongoose.Types.ObjectId(user.id) }
    : {};

// GET /dashboard/summary
exports.getSummary = async (req, res, next) => {
  try {
    const filter = baseFilter(req.user);
    const records = await Record.find(filter);

    const income = records
      .filter((r) => r.type === "income")
      .reduce((sum, r) => sum + r.amount, 0);

    const expense = records
      .filter((r) => r.type === "expense")
      .reduce((sum, r) => sum + r.amount, 0);

    res.json({
      totalIncome: income,
      totalExpense: expense,
      netBalance: income - expense,
      totalRecords: records.length,
    });
  } catch (err) {
    next(err);
  }
};

// GET /dashboard/categories
exports.getCategoryTotals = async (req, res, next) => {
  try {
    const totals = await Record.aggregate([
      { $match: { ...baseMatchStage(req.user), deletedAt: null } },
      {
        $group: {
          _id: { category: "$category", type: "$type" },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.category",
          breakdown: {
            $push: { type: "$_id.type", total: "$total", count: "$count" },
          },
          categoryTotal: { $sum: "$total" },
        },
      },
      { $sort: { categoryTotal: -1 } },
    ]);

    res.json({ categories: totals });
  } catch (err) {
    next(err);
  }
};

// GET /dashboard/recent?limit=5
exports.getRecentActivity = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 5, 50);
    const filter = baseFilter(req.user);

    const records = await Record.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ records });
  } catch (err) {
    next(err);
  }
};

// GET /dashboard/trends?year=2024&groupBy=month|week
exports.getTrends = async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const groupBy = req.query.groupBy === "week" ? "week" : "month";
    const matchStage = {
      ...baseMatchStage(req.user),
      deletedAt: null,
      date: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      },
    };

    const dateGroupField =
      groupBy === "week"
        ? { $isoWeek: "$date" }
        : { $month: "$date" };

    const trends = await Record.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            period: dateGroupField,
            type: "$type",
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.period",
          data: {
            $push: { type: "$_id.type", total: "$total", count: "$count" },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Normalize each period into { period, income, expense, net }
    const normalized = trends.map((t) => {
      const income = t.data.find((d) => d.type === "income")?.total || 0;
      const expense = t.data.find((d) => d.type === "expense")?.total || 0;
      return {
        period: t._id,
        income,
        expense,
        net: income - expense,
      };
    });

    res.json({ year, groupBy, trends: normalized });
  } catch (err) {
    next(err);
  }
};
