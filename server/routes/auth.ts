const express = require('express');
const { signup, login, logout } = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', signup);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/logout
router.post('/logout', logout);

module.exports = router;