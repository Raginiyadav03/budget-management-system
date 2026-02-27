const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Transaction = require("./models/Transaction");
const User = require("./models/User");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI
const PORT = process.env.PORT || 5000;

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

// Function to calculate and update user statistics
async function updateUserStatistics(userId) {
  try {
    // Calculate total income and expense using aggregation
    const balanceResult = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
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

    const totalIncome = balanceResult.length > 0 ? balanceResult[0].totalIncome : 0;
    const totalExpense = balanceResult.length > 0 ? balanceResult[0].totalExpense : 0;
    const totalBalance = totalIncome - totalExpense;

    // Calculate saving status
    let savingStatus = {
      status: '',
      color: ''
    };

    if (totalExpense > totalIncome) {
      savingStatus.status = 'Overspending';
      savingStatus.color = '#dc3545'; // red
    } else if (totalIncome === 0 && totalExpense === 0) {
      savingStatus.status = 'No Data';
      savingStatus.color = '#6c757d'; // gray
    } else if (totalIncome === 0) {
      savingStatus.status = 'Overspending';
      savingStatus.color = '#dc3545'; // red
    } else if (totalExpense === totalIncome) {
      savingStatus.status = 'No Saving';
      savingStatus.color = '#dc3545'; // red
    } else {
      const savings = totalIncome - totalExpense;
      const savingsPercentage = (savings / totalIncome) * 100;

      if (savingsPercentage >= 50) {
        savingStatus.status = 'Excellent';
        savingStatus.color = '#28a745'; // green
      } else if (savingsPercentage >= 30) {
        savingStatus.status = 'Good';
        savingStatus.color = '#ffc107'; // yellow
      } else if (savingsPercentage >= 1) {
        savingStatus.status = 'Average';
        savingStatus.color = '#fd7e14'; // orange
      } else {
        savingStatus.status = 'No Saving';
        savingStatus.color = '#dc3545'; // red
      }
    }

    // Update user document
    await User.findByIdAndUpdate(userId, {
      totalIncome,
      totalExpense,
      totalBalance,
      savingStatus
    });

    return { totalIncome, totalExpense, totalBalance, savingStatus };
  } catch (error) {
    console.error('Error updating user statistics:', error);
    throw error;
  }
}

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

// Get user profile with statistics
app.get("/api/user/profile", getUserId, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        totalIncome: user.totalIncome || 0,
        totalExpense: user.totalExpense || 0,
        totalBalance: user.totalBalance || 0,
        savingStatus: user.savingStatus || { status: 'No Data', color: '#6c757d' },
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Update user profile (name only)
app.put("/api/user/profile", getUserId, async (req, res) => {
  try {
    const { name } = req.body;
    
    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required and cannot be empty" });
    }
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { name: name.trim() },
      { new: true, select: '-password' }
    );
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Return user profile formatted like GET /user/profile for consistency
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      totalIncome: user.totalIncome || 0,
      totalExpense: user.totalExpense || 0,
      totalBalance: user.totalBalance || 0,
      savingStatus: user.savingStatus || { status: 'No Data', color: '#6c757d' },
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: "Failed to update user profile" });
  }
});

// Transaction Routes - require userId
// Get all transactions for the user with pagination and filtering
app.get("/api/transactions", getUserId, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const filter = (req.query.filter && req.query.filter.trim()) || 'all'; // 'all', 'income', or 'expense'
    const skip = (page - 1) * limit;
    
    // Build query with filter
    const query = { user: req.userId };
    if (filter && filter !== 'all' && (filter === 'income' || filter === 'expense')) {
      query.type = filter;
    }
    
    // Get total count for pagination (with filter applied)
    const total = await Transaction.countDocuments(query);
    
    // Get paginated transactions (with filter applied)
    const transactions = await Transaction.find(query)
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
    
    const totalIncome = balanceResult.length > 0 ? balanceResult[0].totalIncome : 0;
    const totalExpense = balanceResult.length > 0 ? balanceResult[0].totalExpense : 0;
    const totalBalance = totalIncome - totalExpense;
    
    // Calculate saving status
    let savingStatus = {
      status: '',
      color: ''
    };
    
    if (totalExpense > totalIncome) {
      // Overspending
      savingStatus.status = 'Overspending';
      savingStatus.color = '#dc3545'; // red
    } else if (totalIncome === 0 && totalExpense === 0) {
      // No transactions
      savingStatus.status = 'No Data';
      savingStatus.color = '#6c757d'; // gray
    } else if (totalIncome === 0) {
      // Only expenses, no income
      savingStatus.status = 'Overspending';
      savingStatus.color = '#dc3545'; // red
    } else if (totalExpense === totalIncome) {
      // No saving
      savingStatus.status = 'No Saving';
      savingStatus.color = '#dc3545'; // red
    } else {
      // Calculate savings percentage
      const savings = totalIncome - totalExpense;
      const savingsPercentage = (savings / totalIncome) * 100;
      
      if (savingsPercentage >= 50) {
        savingStatus.status = 'Excellent';
        savingStatus.color = '#28a745'; // green
      } else if (savingsPercentage >= 30) {
        savingStatus.status = 'Good';
        savingStatus.color = '#ffc107'; // yellow
      } else if (savingsPercentage >= 1) {
        savingStatus.status = 'Average';
        savingStatus.color = '#fd7e14'; // orange
      } else {
        savingStatus.status = 'No Saving';
        savingStatus.color = '#dc3545'; // red
      }
    }
    
    const totalPages = Math.ceil(total / limit);
    
    // Update user statistics in database (async, don't wait for it)
    updateUserStatistics(req.userId).catch(err => {
      console.error('Error updating user statistics:', err);
    });
    
    res.json({
      transactions,
      totalBalance,
      totalIncome,
      totalExpense,
      savingStatus,
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
    
    // Update user statistics
    await updateUserStatistics(req.userId);
    
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
    
    // Update user statistics
    await updateUserStatistics(req.userId);
    
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
    
    // Update user statistics
    await updateUserStatistics(req.userId);
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

// Get monthly statistics for comparison (single month)
app.get("/api/transactions/monthly", getUserId, async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: "Month and year are required" });
    }
    
    // Validate userId
    if (!req.userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Normalize month to have leading zero
    const monthStr = String(month).padStart(2, '0');
    const yearStr = String(year);
    
    // Validate month and year
    const monthNum = parseInt(monthStr);
    const yearNum = parseInt(yearStr);
    
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: "Invalid month" });
    }
    
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({ error: "Invalid year" });
    }
    
    // Create regex pattern to match dates in the format YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    // Pattern: YYYY-MM- where YYYY matches year and MM matches month
    const datePattern = `^${yearStr}-${monthStr}-`;
    
    // Convert userId to ObjectId
    let userIdObjectId;
    try {
      userIdObjectId = new mongoose.Types.ObjectId(req.userId);
    } catch (error) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }
    
    // Get transactions for the month using aggregation
    // Since date is stored as string, we'll use regex to match the year-month pattern
    const monthlyStats = await Transaction.aggregate([
      {
        $match: {
          user: userIdObjectId,
          date: { 
            $regex: datePattern
          }
        }
      },
      {
        $group: {
          _id: null,
          income: {
            $sum: {
              $cond: [{ $eq: ["$type", "income"] }, "$amount", 0]
            }
          },
          expense: {
            $sum: {
              $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0]
            }
          }
        }
      }
    ]);
    
    const result = monthlyStats.length > 0 
      ? { income: monthlyStats[0].income || 0, expense: monthlyStats[0].expense || 0 }
      : { income: 0, expense: 0 };
    
    result.balance = result.income - result.expense;
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching monthly statistics:", error);
    console.error("Error stack:", error.stack);
    console.error("Request query:", req.query);
    console.error("Request userId:", req.userId);
    res.status(500).json({ error: "Failed to fetch monthly statistics", details: error.message });
  }
});

// Get monthly comparison for two months (optimized endpoint)
app.get("/api/transactions/monthly/compare", getUserId, async (req, res) => {
  try {
    const { month1, year1, month2, year2 } = req.query;
    
    if (!month1 || !year1 || !month2 || !year2) {
      return res.status(400).json({ error: "Both months and years are required" });
    }
    
    // Validate userId
    if (!req.userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Convert userId to ObjectId
    let userIdObjectId;
    try {
      userIdObjectId = new mongoose.Types.ObjectId(req.userId);
    } catch (error) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }
    
    // Helper function to get monthly stats
    const getMonthlyStats = async (month, year) => {
      const monthStr = String(month).padStart(2, '0');
      const yearStr = String(year);
      
      // Validate month and year
      const monthNum = parseInt(monthStr);
      const yearNum = parseInt(yearStr);
      
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        throw new Error(`Invalid month: ${month}`);
      }
      
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        throw new Error(`Invalid year: ${year}`);
      }
      
      const datePattern = `^${yearStr}-${monthStr}-`;
      
      const monthlyStats = await Transaction.aggregate([
        {
          $match: {
            user: userIdObjectId,
            date: { 
              $regex: datePattern
            }
          }
        },
        {
          $group: {
            _id: null,
            income: {
              $sum: {
                $cond: [{ $eq: ["$type", "income"] }, "$amount", 0]
              }
            },
            expense: {
              $sum: {
                $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0]
              }
            }
          }
        }
      ]);
      
      const result = monthlyStats.length > 0 
        ? { income: monthlyStats[0].income || 0, expense: monthlyStats[0].expense || 0 }
        : { income: 0, expense: 0 };
      
      result.balance = result.income - result.expense;
      return result;
    };
    
    // Get stats for both months in parallel
    const [month1Stats, month2Stats] = await Promise.all([
      getMonthlyStats(month1, year1),
      getMonthlyStats(month2, year2)
    ]);
    
    res.json({
      month1: month1Stats,
      month2: month2Stats
    });
  } catch (error) {
    console.error("Error fetching monthly comparison:", error);
    console.error("Error stack:", error.stack);
    console.error("Request query:", req.query);
    res.status(500).json({ error: "Failed to fetch monthly comparison", details: error.message });
  }
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});