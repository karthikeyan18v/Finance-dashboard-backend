const Record = require("../models/Record");
const User = require("../models/User");

// Resolve base filter — viewers see only their own records; analyst/admin see all
const baseFilter = (user) =>
  user.role === "viewer" ? { createdBy: user.id } : {};

// POST /records — admin only
exports.createRecord = async (req, res, next) => {
  try {
    const { amount, type, category, date, notes, userId } = req.body;

    // If admin passes a userId, assign the record to that user; otherwise to the admin
    let ownerId = req.user.id;
    if (userId) {
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "Target user not found" });
      }
      ownerId = userId;
    }

    const record = await Record.create({
      amount,
      type,
      category,
      date,
      notes,
      createdBy: ownerId,
    });

    const populated = await record.populate("createdBy", "name email role");
    res.status(201).json({ message: "Record created", record: populated });
  } catch (err) {
    next(err);
  }
};

// GET /records — all roles (scoped by role)
exports.getRecords = async (req, res, next) => {
  try {
    const {
      type,
      category,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 10,
      sortBy = "date",
      order = "desc",
    } = req.query;

    const filter = baseFilter(req.user);

    if (type) filter.type = type;
    if (category) filter.category = { $regex: category, $options: "i" };
    if (search) filter.notes = { $regex: search, $options: "i" };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const sortField = ["date", "amount", "createdAt"].includes(sortBy) ? sortBy : "date";

    const skip = (Number(page) - 1) * Number(limit);
    const [records, total] = await Promise.all([
      Record.find(filter)
        .populate("createdBy", "name email role")
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(Number(limit)),
      Record.countDocuments(filter),
    ]);

    res.json({
      records,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /records/:id — all roles (scoped by role)
exports.getRecordById = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, ...baseFilter(req.user) };
    const record = await Record.findOne(filter).populate("createdBy", "name email role");

    if (!record) return res.status(404).json({ message: "Record not found" });
    res.json(record);
  } catch (err) {
    next(err);
  }
};

// PUT /records/:id — admin only
exports.updateRecord = async (req, res, next) => {
  try {
    const { amount, type, category, date, notes } = req.body;
    const updates = {};
    if (amount !== undefined) updates.amount = amount;
    if (type) updates.type = type;
    if (category) updates.category = category;
    if (date) updates.date = date;
    if (notes !== undefined) updates.notes = notes;

    const record = await Record.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "name email role");

    if (!record) return res.status(404).json({ message: "Record not found" });
    res.json({ message: "Record updated", record });
  } catch (err) {
    next(err);
  }
};

// DELETE /records/:id — admin only (soft delete)
exports.deleteRecord = async (req, res, next) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    record.deletedAt = new Date();
    await record.save();

    res.json({ message: "Record deleted" });
  } catch (err) {
    next(err);
  }
};
