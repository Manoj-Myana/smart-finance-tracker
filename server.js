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
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Smart Finance Tracker API is running!',
    timestamp: new Date().toISOString()
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