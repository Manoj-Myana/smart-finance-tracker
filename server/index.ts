const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const goalsRoutes = require('./routes/goals');
const { initializeDatabase } = require('./config/database');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // React app URL
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/goals', goalsRoutes);

// Health check endpoint
app.get('/api/health', (req: any, res: any) => {
  res.json({ 
    success: true, 
    message: 'Smart Finance Tracker API is running!',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req: any, res: any) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint not found' 
  });
});

// Error handler
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 Smart Finance Tracker API running on http://localhost:${PORT}`);
      console.log(`📊 Database initialized and ready`);
      console.log(`🌐 CORS enabled for http://localhost:3000`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();