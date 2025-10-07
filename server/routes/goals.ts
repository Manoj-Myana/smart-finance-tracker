const express = require('express');
const router = express.Router();
const { connectToDatabase } = require('../config/database');

// Get all goals for a user
router.get('/:userId', async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const db = await connectToDatabase();
    
    const goals = await db.all(
      'SELECT * FROM goals WHERE user_id = ? ORDER BY target_date ASC',
      [userId]
    );
    
    res.json({
      success: true,
      goals: goals
    });
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch goals'
    });
  }
});

// Add a new goal
router.post('/', async (req: any, res: any) => {
  try {
    const { user_id, target_date, description, amount } = req.body;
    
    if (!user_id || !target_date || !description || !amount) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    const db = await connectToDatabase();
    
    const result = await db.run(
      'INSERT INTO goals (user_id, target_date, description, amount, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
      [user_id, target_date, description, amount]
    );
    
    res.json({
      success: true,
      message: 'Goal added successfully',
      goalId: result.lastID
    });
  } catch (error) {
    console.error('Error adding goal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add goal'
    });
  }
});

// Update a goal
router.put('/:goalId', async (req: any, res: any) => {
  try {
    const { goalId } = req.params;
    const { target_date, description, amount } = req.body;
    
    if (!target_date || !description || !amount) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    const db = await connectToDatabase();
    
    await db.run(
      'UPDATE goals SET target_date = ?, description = ?, amount = ? WHERE id = ?',
      [target_date, description, amount, goalId]
    );
    
    res.json({
      success: true,
      message: 'Goal updated successfully'
    });
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update goal'
    });
  }
});

// Delete a goal
router.delete('/:goalId', async (req: any, res: any) => {
  try {
    const { goalId } = req.params;
    const db = await connectToDatabase();
    
    await db.run('DELETE FROM goals WHERE id = ?', [goalId]);
    
    res.json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete goal'
    });
  }
});

module.exports = router;