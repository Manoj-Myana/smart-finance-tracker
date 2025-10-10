const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Add error handlers for unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process - just log the error
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Log but don't exit immediately
});

const app = express();
const PORT = process.env.BACKEND_PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

// Database setup
const dbPath = path.join(__dirname, 'database', 'finance_tracker.db');
const dbDir = path.dirname(dbPath);

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize database
const db = new sqlite3.Database(dbPath);

// Create tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    agreedToTerms BOOLEAN NOT NULL DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    token TEXT NOT NULL,
    expiresAt DATETIME NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    frequency TEXT NOT NULL CHECK (frequency IN ('regular', 'irregular')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    target_date TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    loan_amount REAL NOT NULL,
    interest_rate REAL NOT NULL,
    tenure INTEGER NOT NULL,
    loan_type TEXT NOT NULL,
    interest_type TEXT NOT NULL CHECK (interest_type IN ('simple', 'compound')),
    monthly_emi REAL NOT NULL,
    total_amount REAL NOT NULL,
    total_interest REAL NOT NULL,
    expected_clearance_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'defaulted')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware for protected routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('DEBUG - Auth Header:', authHeader);
  console.log('DEBUG - Extracted Token:', token);

  if (!token) {
    console.log('DEBUG - No token provided');
    return res.status(401).json({ 
      success: false, 
      message: 'Access token is required' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('DEBUG - JWT verification error:', err.message);
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
    console.log('DEBUG - JWT verification successful, user:', user);
    req.user = user;
    next();
  });
};

// Signup endpoint
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword, agreedToTerms } = req.body;

    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match' 
      });
    }

    if (!agreedToTerms) {
      return res.status(400).json({ 
        success: false, 
        message: 'You must agree to the terms and conditions' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please enter a valid email address' 
      });
    }

    // Check if user already exists
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Internal server error' 
        });
      }

      if (row) {
        return res.status(400).json({ 
          success: false, 
          message: 'User with this email already exists' 
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      db.run(
        `INSERT INTO users (fullName, email, password, agreedToTerms, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [fullName, email, hashedPassword, agreedToTerms ? 1 : 0],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ 
              success: false, 
              message: 'Internal server error' 
            });
          }

          const userId = this.lastID;

          // Generate JWT token
          const token = jwt.sign(
            { userId, email, fullName },
            JWT_SECRET,
            { expiresIn: '7d' }
          );

          // Store session
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);
          
          db.run(
            'INSERT INTO user_sessions (userId, token, expiresAt) VALUES (?, ?, ?)',
            [userId, token, expiresAt.toISOString()],
            (err) => {
              if (err) {
                console.error('Session storage error:', err);
              }

              res.status(201).json({
                success: true,
                message: 'Account created successfully',
                data: {
                  user: {
                    id: userId,
                    fullName,
                    email,
                  },
                  token
                }
              });
            }
          );
        }
      );
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Find user
    db.get(
      'SELECT id, fullName, email, password FROM users WHERE email = ?',
      [email],
      async (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
          });
        }

        if (!user) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid email or password' 
          });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid email or password' 
          });
        }

        // Generate JWT token
        const token = jwt.sign(
          { userId: user.id, email: user.email, fullName: user.fullName },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        // Store session
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        db.run(
          'INSERT INTO user_sessions (userId, token, expiresAt) VALUES (?, ?, ?)',
          [user.id, token, expiresAt.toISOString()],
          (err) => {
            if (err) {
              console.error('Session storage error:', err);
            }

            res.json({
              success: true,
              message: 'Login successful',
              data: {
                user: {
                  id: user.id,
                  fullName: user.fullName,
                  email: user.email,
                },
                token
              }
            });
          }
        );
      }
    );

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      db.run('DELETE FROM user_sessions WHERE token = ?', [token], (err) => {
        if (err) {
          console.error('Logout error:', err);
        }
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Transaction Routes

// Get all transactions for a user
app.get('/api/transactions/:userId', authenticateToken, (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can only access their own transactions
    if (parseInt(userId) !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    db.all(
      `SELECT * FROM transactions 
       WHERE user_id = ? 
       ORDER BY date DESC, created_at DESC`,
      [userId],
      (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Internal server error'
          });
        }

        res.json(rows);
      }
    );
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Helper function to handle bulk transactions
function handleBulkTransactions(req, res) {
  const transactions = req.body.transactions;
  console.log(`Processing bulk transaction request with ${transactions.length} transactions`);
  
  let savedCount = 0;
  let errorCount = 0;
  const errors = [];

  // Validate all transactions first
  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    const { user_id, date, description, amount, type, frequency } = transaction;
    
    // Verify user can only add transactions for themselves
    if (parseInt(user_id) !== req.user.userId) {
      console.log(`Transaction ${i}: Access denied - user_id mismatch`, parseInt(user_id), req.user.userId);
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Basic validation
    if (!user_id || !date || !description || !amount || !type || !frequency) {
      errors.push(`Transaction ${i}: Missing required fields`);
      continue;
    }

    if (type !== 'credit' && type !== 'debit') {
      errors.push(`Transaction ${i}: Invalid transaction type`);
      continue;
    }

    if (frequency !== 'regular' && frequency !== 'irregular') {
      errors.push(`Transaction ${i}: Invalid frequency`);
      continue;
    }

    if (isNaN(amount) || parseFloat(amount) <= 0) {
      errors.push(`Transaction ${i}: Invalid amount`);
      continue;
    }
  }

  if (errors.length > 0) {
    console.log('Bulk transaction validation errors:', errors);
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors
    });
  }

  // Insert transactions one by one
  let completedTransactions = 0;
  const insertedTransactions = [];

  transactions.forEach((transaction, index) => {
    const { user_id, date, description, amount, type, frequency } = transaction;
    
    db.run(
      `INSERT INTO transactions (user_id, date, description, amount, type, frequency, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [user_id, date, description, parseFloat(amount), type, frequency],
      function(err) {
        if (err) {
          console.error(`Database error during bulk insert ${index}:`, err);
          errorCount++;
        } else {
          console.log(`Transaction ${index} inserted successfully, ID:`, this.lastID);
          savedCount++;
          insertedTransactions.push({
            id: this.lastID,
            user_id,
            date,
            description,
            amount: parseFloat(amount),
            type,
            frequency
          });
        }

        completedTransactions++;
        
        // Send response when all transactions are processed
        if (completedTransactions === transactions.length) {
          console.log(`Bulk transaction complete: ${savedCount} saved, ${errorCount} errors`);
          res.status(savedCount > 0 ? 201 : 500).json({
            success: savedCount > 0,
            message: `Bulk transaction complete: ${savedCount} saved, ${errorCount} errors`,
            saved_count: savedCount,
            error_count: errorCount,
            transactions: insertedTransactions
          });
        }
      }
    );
  });
}

// Add a new transaction (or multiple transactions)
app.post('/api/transactions', authenticateToken, (req, res) => {
  try {
    console.log('Add transaction request received:', req.body);
    console.log('Authenticated user:', req.user);
    
    // Check if this is a bulk transaction request
    if (req.body.transactions && Array.isArray(req.body.transactions)) {
      return handleBulkTransactions(req, res);
    }
    
    const { user_id, date, description, amount, type, frequency } = req.body;
    
    // Verify user can only add transactions for themselves
    if (parseInt(user_id) !== req.user.userId) {
      console.log('Access denied: user_id mismatch', parseInt(user_id), req.user.userId);
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Validation
    if (!user_id || !date || !description || !amount || !type || !frequency) {
      console.log('Validation failed: missing fields', { user_id, date, description, amount, type, frequency });
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (type !== 'credit' && type !== 'debit') {
      console.log('Invalid transaction type:', type);
      return res.status(400).json({
        success: false,
        message: 'Transaction type must be either credit or debit'
      });
    }

    if (frequency !== 'regular' && frequency !== 'irregular') {
      console.log('Invalid frequency:', frequency);
      return res.status(400).json({
        success: false,
        message: 'Frequency must be either regular or irregular'
      });
    }

    if (isNaN(amount) || parseFloat(amount) <= 0) {
      console.log('Invalid amount:', amount);
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    console.log('Inserting transaction into database...');
    db.run(
      `INSERT INTO transactions (user_id, date, description, amount, type, frequency, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [user_id, date, description, parseFloat(amount), type, frequency],
      function(err) {
        if (err) {
          console.error('Database error during insert:', err);
          return res.status(500).json({
            success: false,
            message: 'Internal server error'
          });
        }

        console.log('Transaction inserted successfully, ID:', this.lastID);
        // Get the created transaction
        db.get(
          'SELECT * FROM transactions WHERE id = ?',
          [this.lastID],
          (err, row) => {
            if (err) {
              console.error('Database error during retrieval:', err);
              return res.status(500).json({
                success: false,
                message: 'Transaction created but failed to retrieve'
              });
            }

            console.log('Transaction retrieved successfully:', row);
            res.status(201).json({
              success: true,
              message: 'Transaction added successfully',
              transaction: row
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Add transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update a transaction
app.put('/api/transactions/:id', authenticateToken, (req, res) => {
  try {
    console.log('Update transaction request received:', req.params.id, req.body);
    console.log('Authenticated user:', req.user);
    
    const { id } = req.params;
    const { user_id, date, description, amount, type, frequency } = req.body;
    
    // Verify user can only update transactions for themselves
    if (parseInt(user_id) !== req.user.userId) {
      console.log('Access denied: user_id mismatch', parseInt(user_id), req.user.userId);
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Validation
    if (!user_id || !date || !description || !amount || !type || !frequency) {
      console.log('Validation failed: missing fields', { user_id, date, description, amount, type, frequency });
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (type !== 'credit' && type !== 'debit') {
      console.log('Invalid transaction type:', type);
      return res.status(400).json({
        success: false,
        message: 'Transaction type must be either credit or debit'
      });
    }

    if (frequency !== 'regular' && frequency !== 'irregular') {
      console.log('Invalid frequency:', frequency);
      return res.status(400).json({
        success: false,
        message: 'Frequency must be either regular or irregular'
      });
    }

    if (isNaN(amount) || parseFloat(amount) <= 0) {
      console.log('Invalid amount:', amount);
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    // First, verify the transaction belongs to the authenticated user
    db.get(
      'SELECT user_id FROM transactions WHERE id = ?',
      [id],
      (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Internal server error'
          });
        }

        if (!row) {
          return res.status(404).json({
            success: false,
            message: 'Transaction not found'
          });
        }

        if (row.user_id !== req.user.userId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }

        // Update the transaction
        console.log('Updating transaction in database...');
        db.run(
          `UPDATE transactions 
           SET date = ?, description = ?, amount = ?, type = ?, frequency = ?
           WHERE id = ?`,
          [date, description, parseFloat(amount), type, frequency, id],
          function(err) {
            if (err) {
              console.error('Database error during update:', err);
              return res.status(500).json({
                success: false,
                message: 'Internal server error'
              });
            }

            if (this.changes === 0) {
              return res.status(404).json({
                success: false,
                message: 'Transaction not found'
              });
            }

            console.log('Transaction updated successfully');
            // Get the updated transaction
            db.get(
              'SELECT * FROM transactions WHERE id = ?',
              [id],
              (err, updatedRow) => {
                if (err) {
                  console.error('Database error during retrieval:', err);
                  return res.status(500).json({
                    success: false,
                    message: 'Transaction updated but failed to retrieve'
                  });
                }

                console.log('Updated transaction retrieved successfully:', updatedRow);
                res.json({
                  success: true,
                  message: 'Transaction updated successfully',
                  transaction: updatedRow
                });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete a transaction
app.delete('/api/transactions/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    // First, verify the transaction belongs to the authenticated user
    db.get(
      'SELECT user_id FROM transactions WHERE id = ?',
      [id],
      (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Internal server error'
          });
        }

        if (!row) {
          return res.status(404).json({
            success: false,
            message: 'Transaction not found'
          });
        }

        if (row.user_id !== req.user.userId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }

        // Delete the transaction
        db.run(
          'DELETE FROM transactions WHERE id = ?',
          [id],
          function(err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({
                success: false,
                message: 'Internal server error'
              });
            }

            if (this.changes === 0) {
              return res.status(404).json({
                success: false,
                message: 'Transaction not found'
              });
            }

            res.json({
              success: true,
              message: 'Transaction deleted successfully'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});
// Goals endpoints
// Get all goals for a user
app.get('/api/goals/:userId', authenticateToken, (req, res) => {
  const { userId } = req.params;
  const userIdFromToken = req.user.userId; // Fixed: use userId instead of id

  // Ensure user can only access their own goals
  if (parseInt(userId) !== userIdFromToken) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  db.all(
    'SELECT * FROM goals WHERE user_id = ? ORDER BY target_date ASC',
    [userId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching goals:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch goals'
        });
      }
      
      res.json({
        success: true,
        goals: rows
      });
    }
  );
});

// Add a new goal
app.post('/api/goals', authenticateToken, (req, res) => {
  const { user_id, target_date, description, amount } = req.body;
  const userIdFromToken = req.user.userId; // Fixed: use userId instead of id

  // Ensure user can only create goals for themselves
  if (parseInt(user_id) !== userIdFromToken) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Validation
  if (!user_id || !target_date || !description || !amount) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  if (isNaN(amount) || parseFloat(amount) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Amount must be a positive number'
    });
  }

  db.run(
    'INSERT INTO goals (user_id, target_date, description, amount, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
    [user_id, target_date, description, parseFloat(amount)],
    function(err) {
      if (err) {
        console.error('Error adding goal:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to add goal'
        });
      }
      
      res.json({
        success: true,
        message: 'Goal added successfully',
        goalId: this.lastID
      });
    }
  );
});

// Update a goal
app.put('/api/goals/:goalId', authenticateToken, (req, res) => {
  const { goalId } = req.params;
  const { target_date, description, amount } = req.body;
  const userIdFromToken = req.user.userId; // Fixed: use userId instead of id

  // Validation
  if (!target_date || !description || !amount) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  if (isNaN(amount) || parseFloat(amount) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Amount must be a positive number'
    });
  }

  // First check if the goal belongs to the user
  db.get(
    'SELECT user_id FROM goals WHERE id = ?',
    [goalId],
    (err, row) => {
      if (err) {
        console.error('Error checking goal ownership:', err);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }

      if (!row) {
        return res.status(404).json({
          success: false,
          message: 'Goal not found'
        });
      }

      if (row.user_id !== userIdFromToken) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Update the goal
      db.run(
        'UPDATE goals SET target_date = ?, description = ?, amount = ?, updated_at = datetime("now") WHERE id = ?',
        [target_date, description, parseFloat(amount), goalId],
        function(err) {
          if (err) {
            console.error('Error updating goal:', err);
            return res.status(500).json({
              success: false,
              message: 'Failed to update goal'
            });
          }
          
          res.json({
            success: true,
            message: 'Goal updated successfully'
          });
        }
      );
    }
  );
});

// Delete a goal
app.delete('/api/goals/:goalId', authenticateToken, (req, res) => {
  const { goalId } = req.params;
  const userIdFromToken = req.user.userId; // Fixed: use userId instead of id

  // First check if the goal belongs to the user
  db.get(
    'SELECT user_id FROM goals WHERE id = ?',
    [goalId],
    (err, row) => {
      if (err) {
        console.error('Error checking goal ownership:', err);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }

      if (!row) {
        return res.status(404).json({
          success: false,
          message: 'Goal not found'
        });
      }

      if (row.user_id !== userIdFromToken) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Delete the goal
      db.run(
        'DELETE FROM goals WHERE id = ?',
        [goalId],
        function(err) {
          if (err) {
            console.error('Error deleting goal:', err);
            return res.status(500).json({
              success: false,
              message: 'Failed to delete goal'
            });
          }
          
          res.json({
            success: true,
            message: 'Goal deleted successfully'
          });
        }
      );
    }
  );
});

// ===== GOALS ENDPOINTS =====

// Get all goals for a user
app.get('/api/goals/:userId', authenticateToken, (req, res) => {
  const { userId } = req.params;
  const user = req.user;

  // Check if user is accessing their own goals
  if (parseInt(userId) !== user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  db.all(
    'SELECT * FROM goals WHERE user_id = ? ORDER BY target_date ASC',
    [userId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching goals:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch goals'
        });
      }

      res.json({
        success: true,
        goals: rows
      });
    }
  );
});

// Add a new goal
app.post('/api/goals', authenticateToken, (req, res) => {
  const { user_id, target_date, description, amount } = req.body;
  const user = req.user;

  // Check if user is adding goal for themselves
  if (parseInt(user_id) !== user.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Validation
  if (!user_id || !target_date || !description || !amount) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  if (isNaN(amount) || parseFloat(amount) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Amount must be a positive number'
    });
  }

  db.run(
    'INSERT INTO goals (user_id, target_date, description, amount, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
    [user_id, target_date, description, parseFloat(amount)],
    function(err) {
      if (err) {
        console.error('Error adding goal:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to add goal'
        });
      }

      res.json({
        success: true,
        message: 'Goal added successfully',
        goalId: this.lastID
      });
    }
  );
});

// Update a goal
app.put('/api/goals/:goalId', authenticateToken, (req, res) => {
  const { goalId } = req.params;
  const { target_date, description, amount } = req.body;
  const user = req.user;

  // First check if the goal belongs to the user
  db.get(
    'SELECT user_id FROM goals WHERE id = ?',
    [goalId],
    (err, goal) => {
      if (err) {
        console.error('Error checking goal ownership:', err);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }

      if (!goal) {
        return res.status(404).json({
          success: false,
          message: 'Goal not found'
        });
      }

      if (goal.user_id !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Validation
      if (!target_date || !description || !amount) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      if (isNaN(amount) || parseFloat(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number'
        });
      }

      // Update the goal
      db.run(
        'UPDATE goals SET target_date = ?, description = ?, amount = ?, updated_at = datetime("now") WHERE id = ?',
        [target_date, description, parseFloat(amount), goalId],
        function(err) {
          if (err) {
            console.error('Error updating goal:', err);
            return res.status(500).json({
              success: false,
              message: 'Failed to update goal'
            });
          }

          res.json({
            success: true,
            message: 'Goal updated successfully'
          });
        }
      );
    }
  );
});

// Delete a goal
app.delete('/api/goals/:goalId', authenticateToken, (req, res) => {
  const { goalId } = req.params;
  const user = req.user;

  // First check if the goal belongs to the user
  db.get(
    'SELECT user_id FROM goals WHERE id = ?',
    [goalId],
    (err, goal) => {
      if (err) {
        console.error('Error checking goal ownership:', err);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }

      if (!goal) {
        return res.status(404).json({
          success: false,
          message: 'Goal not found'
        });
      }

      if (goal.user_id !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Delete the goal
      db.run(
        'DELETE FROM goals WHERE id = ?',
        [goalId],
        function(err) {
          if (err) {
            console.error('Error deleting goal:', err);
            return res.status(500).json({
              success: false,
              message: 'Failed to delete goal'
            });
          }

          res.json({
            success: true,
            message: 'Goal deleted successfully'
          });
        }
      );
    }
  );
});

// Test authentication endpoint
app.get('/api/test-auth', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication working!',
    user: req.user
  });
});

// Test endpoint to list all users (for debugging)
app.get('/api/debug/users', (req, res) => {
  db.all('SELECT id, fullName, email, createdAt FROM users', [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    res.json({ success: true, users: rows });
  });
});

// ==================== LOAN ENDPOINTS ====================

// Get all loans for a user
app.get('/api/loans/:userId', authenticateToken, (req, res) => {
  const userId = parseInt(req.params.userId);
  
  // Ensure user can only access their own loans  
  if (parseInt(req.user.userId) !== userId) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied' 
    });
  }

  const query = `
    SELECT * FROM loans 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `;

  db.all(query, [userId], (err, loans) => {
    if (err) {
      console.error('Error fetching loans:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch loans' 
      });
    }

    res.json(loans || []);
  });
});

// Create a new loan
app.post('/api/loans', authenticateToken, (req, res) => {
  const {
    user_id,
    loan_amount,
    interest_rate,
    tenure,
    loan_type,
    interest_type,
    monthly_emi,
    total_amount,
    total_interest,
    expected_clearance_date,
    status = 'active'
  } = req.body;

  // Validate required fields
  if (!user_id || !loan_amount || !interest_rate || !tenure || !loan_type || 
      !interest_type || !monthly_emi || !total_amount || !total_interest || 
      !expected_clearance_date) {
    return res.status(400).json({ 
      success: false, 
      message: 'All loan fields are required' 
    });
  }

  // Ensure user can only create loans for themselves
  if (parseInt(req.user.userId) !== parseInt(user_id)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied' 
    });
  }

  const query = `
    INSERT INTO loans (
      user_id, loan_amount, interest_rate, tenure, loan_type, 
      interest_type, monthly_emi, total_amount, total_interest, 
      expected_clearance_date, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  const values = [
    user_id, loan_amount, interest_rate, tenure, loan_type,
    interest_type, monthly_emi, total_amount, total_interest,
    expected_clearance_date, status
  ];

  db.run(query, values, function(err) {
    if (err) {
      console.error('Error creating loan:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create loan' 
      });
    }

    res.status(201).json({ 
      success: true, 
      message: 'Loan created successfully',
      loanId: this.lastID 
    });
  });
});

// Update loan status
app.put('/api/loans/:loanId', authenticateToken, (req, res) => {
  const loanId = parseInt(req.params.loanId);
  const { status } = req.body;

  if (!status || !['active', 'completed', 'defaulted'].includes(status)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Valid status is required' 
    });
  }

  // First, check if the loan belongs to the user
  const checkQuery = 'SELECT user_id FROM loans WHERE id = ?';
  
  db.get(checkQuery, [loanId], (err, loan) => {
    if (err) {
      console.error('Error checking loan ownership:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Database error' 
      });
    }

    if (!loan) {
      return res.status(404).json({ 
        success: false, 
        message: 'Loan not found' 
      });
    }

    if (loan.user_id !== parseInt(req.user.userId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Update the loan status
    const updateQuery = 'UPDATE loans SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    db.run(updateQuery, [status, loanId], function(err) {
      if (err) {
        console.error('Error updating loan:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to update loan' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Loan updated successfully' 
      });
    });
  });
});

// Delete a loan
app.delete('/api/loans/:loanId', authenticateToken, (req, res) => {
  const loanId = parseInt(req.params.loanId);

  // First, check if the loan belongs to the user
  const checkQuery = 'SELECT user_id FROM loans WHERE id = ?';
  
  db.get(checkQuery, [loanId], (err, loan) => {
    if (err) {
      console.error('Error checking loan ownership:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Database error' 
      });
    }

    if (!loan) {
      return res.status(404).json({ 
        success: false, 
        message: 'Loan not found' 
      });
    }

    if (loan.user_id !== parseInt(req.user.userId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied' 
      });
    }

    // Delete the loan
    const deleteQuery = 'DELETE FROM loans WHERE id = ?';
    
    db.run(deleteQuery, [loanId], function(err) {
      if (err) {
        console.error('Error deleting loan:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to delete loan' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Loan deleted successfully' 
      });
    });
  });
});

// Get loan statistics for a user
app.get('/api/loans/:userId/stats', authenticateToken, (req, res) => {
  const userId = parseInt(req.params.userId);
  
  if (parseInt(req.user.userId) !== userId) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied' 
    });
  }

  const query = `
    SELECT 
      COUNT(*) as total_loans,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_loans,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_loans,
      SUM(CASE WHEN status = 'active' THEN loan_amount ELSE 0 END) as total_active_amount,
      SUM(CASE WHEN status = 'active' THEN monthly_emi ELSE 0 END) as total_monthly_emi
    FROM loans 
    WHERE user_id = ?
  `;

  db.get(query, [userId], (err, stats) => {
    if (err) {
      console.error('Error fetching loan stats:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch loan statistics' 
      });
    }

    res.json(stats || {
      total_loans: 0,
      active_loans: 0,
      completed_loans: 0,
      total_active_amount: 0,
      total_monthly_emi: 0
    });
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Smart Finance Tracker API is running!',
    timestamp: new Date().toISOString()
  });
});

// Test authentication endpoint
app.get('/api/test-auth', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication working',
    user: req.user
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint not found' 
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Smart Finance Tracker API running on http://localhost:${PORT}`);
  console.log(`📊 Database initialized and ready`);
  console.log(`🌐 CORS enabled for http://localhost:3000 and http://localhost:3001`);
});

module.exports = app;