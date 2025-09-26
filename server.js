const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
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

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token is required' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
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

// Add a new transaction
app.post('/api/transactions', authenticateToken, (req, res) => {
  try {
    console.log('Add transaction request received:', req.body);
    console.log('Authenticated user:', req.user);
    
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