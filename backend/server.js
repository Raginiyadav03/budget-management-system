const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Transaction = require("./models/Transaction");
const User = require("./models/User");

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection string
const MONGODB_URI = "mongodb+srv://ragini:ragini0304@sachin.vgvc0bb.mongodb.net/budgetManagement?retryWrites=true&w=majority";

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB successfully!");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

// Simple middleware to get userId from request
const getUserId = (req, res, next) => {
  // Try to get userId from body, query params, or headers
  const userId = (req.body && req.body.userId) || req.query.userId || req.headers['user-id'];
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }
  req.userId = userId;
  next();
};

// Routes
app.get("/", (req, res) => {
  res.send("Budget Management API is running!");
});

// Authentication Routes
// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Create new user
    const user = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password
    });

    await user.save();

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "User with this email already exists" });
    }
    res.status(500).json({ error: "Failed to register user" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check password (simple comparison, no encryption)
    if (user.password !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to login" });
  }
});

// Transaction Routes - require userId
// Get all transactions for the user with pagination
app.get("/api/transactions", getUserId, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const total = await Transaction.countDocuments({ user: req.userId });
    
    // Get paginated transactions
    const transactions = await Transaction.find({ user: req.userId })
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Calculate total balance efficiently using aggregation
    const balanceResult = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.userId) } },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: {
              $cond: [{ $eq: ["$type", "income"] }, "$amount", 0]
            }
          },
          totalExpense: {
            $sum: {
              $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0]
            }
          }
        }
      }
    ]);
    
    const totalBalance = balanceResult.length > 0 
      ? balanceResult[0].totalIncome - balanceResult[0].totalExpense 
      : 0;
    
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      transactions,
      totalBalance,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// Get a single transaction by ID
app.get("/api/transactions/:id", getUserId, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.userId
    });
    
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch transaction" });
  }
});

// Create a new transaction
app.post("/api/transactions", getUserId, async (req, res) => {
  try {
    const { description, amount, type, date } = req.body;
    
    // Validation
    if (!description || !amount || !type || !date) {
      return res.status(400).json({ error: "All fields are required" });
    }
    
    if (type !== "income" && type !== "expense") {
      return res.status(400).json({ error: "Type must be 'income' or 'expense'" });
    }
    
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number" });
    }
    
    const transaction = new Transaction({
      description: description.trim(),
      amount: parseFloat(amount),
      type,
      date,
      user: req.userId
    });
    
    const savedTransaction = await transaction.save();
    res.status(201).json(savedTransaction);
  } catch (error) {
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

// Update a transaction
app.put("/api/transactions/:id", getUserId, async (req, res) => {
  try {
    const { description, amount, type, date } = req.body;
    
    // Validation
    if (!description || !amount || !type || !date) {
      return res.status(400).json({ error: "All fields are required" });
    }
    
    if (type !== "income" && type !== "expense") {
      return res.status(400).json({ error: "Type must be 'income' or 'expense'" });
    }
    
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number" });
    }
    
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      {
        description: description.trim(),
        amount: parseFloat(amount),
        type,
        date
      },
      { new: true, runValidators: true }
    );
    
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: "Failed to update transaction" });
  }
});

// Delete a transaction
app.delete("/api/transactions/:id", getUserId, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    });
    
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});