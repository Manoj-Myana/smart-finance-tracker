const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

interface SignupRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
}

interface LoginRequest {
  email: string;
  password: string;
}

const signup = async (req: any, res: any) => {
  try {
    const { fullName, email, password, confirmPassword, agreedToTerms }: SignupRequest = req.body;

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

    const db = await getDatabase();

    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await db.run(
      `INSERT INTO users (fullName, email, password, agreedToTerms, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [fullName, email, hashedPassword, agreedToTerms ? 1 : 0]
    );

    const userId = result.lastID;

    // Generate JWT token
    const token = jwt.sign(
      { userId, email, fullName },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Store session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await db.run(
      'INSERT INTO user_sessions (userId, token, expiresAt) VALUES (?, ?, ?)',
      [userId, token, expiresAt.toISOString()]
    );

    await db.close();

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

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

const login = async (req: any, res: any) => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    const db = await getDatabase();

    // Find user
    const user = await db.get(
      'SELECT id, fullName, email, password FROM users WHERE email = ?',
      [email]
    );

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
    
    await db.run(
      'INSERT INTO user_sessions (userId, token, expiresAt) VALUES (?, ?, ?)',
      [user.id, token, expiresAt.toISOString()]
    );

    await db.close();

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

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

const logout = async (req: any, res: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const db = await getDatabase();
      await db.run('DELETE FROM user_sessions WHERE token = ?', [token]);
      await db.close();
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
};

module.exports = {
  signup,
  login,
  logout
};