// Utility functions for notifications

interface UserType {
  id: number;
  fullName: string;
  email: string;
}

interface Transaction {
  id: number;
  user_id: number;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  frequency: 'regular' | 'irregular';
  created_at: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'error';
  timestamp: Date;
  read: boolean;
  category: 'system' | 'reminder' | 'budget' | 'savings';
}

interface Reminder {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'collect' | 'pay';
  isCompleted: boolean;
  createdAt: string;
}

interface BudgetLimit {
  id: string;
  amount: number;
  month: string; // YYYY-MM format
  currentSpent: number;
  isActive: boolean;
  createdAt: string;
}

interface SavingsTarget {
  id: string;
  targetAmount: number;
  currentSaved: number;
  month: string; // YYYY-MM format
  isActive: boolean;
  createdAt: string;
}

// Get today's date in YYYY-MM-DD format
const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Check if a date is today
const isToday = (dateString: string): boolean => {
  const today = getTodayDateString();
  return dateString === today;
};

// Get today's notification count for a specific user
export const getTodayNotificationCount = (user: UserType): number => {
  if (!user) return 0;

  let todayCount = 0;
  const today = getTodayDateString();

  try {
    // Get notifications
    const notificationsData = localStorage.getItem(`notifications_${user.id}`);
    const notifications: Notification[] = notificationsData ? JSON.parse(notificationsData) : [];
    
    // Count unread notifications from today
    const todayNotifications = notifications.filter(notification => {
      const notificationDate = new Date(notification.timestamp).toISOString().split('T')[0];
      return !notification.read && notificationDate === today;
    });
    todayCount += todayNotifications.length;

    // Get reminders
    const remindersData = localStorage.getItem(`reminders_${user.id}`);
    const reminders: Reminder[] = remindersData ? JSON.parse(remindersData) : [];
    
    // Count today's pending reminders
    const todayReminders = reminders.filter(reminder => 
      isToday(reminder.date) && !reminder.isCompleted
    );
    todayCount += todayReminders.length;

    // Get budget limits and check for warnings
    const budgetData = localStorage.getItem(`budgetLimits_${user.id}`);
    const budgetLimits: BudgetLimit[] = budgetData ? JSON.parse(budgetData) : [];
    
    // Get transactions to calculate current spending
    const transactionsData = localStorage.getItem(`transactions_${user.id}`);
    const transactions: Transaction[] = transactionsData ? JSON.parse(transactionsData) : [];
    
    const currentMonth = today.substring(0, 7); // YYYY-MM format
    const currentBudget = budgetLimits.find(budget => budget.month === currentMonth && budget.isActive);
    
    if (currentBudget) {
      // Calculate current month spending
      const currentMonthTransactions = transactions.filter(transaction => {
        const transactionMonth = transaction.date.substring(0, 7);
        return transactionMonth === currentMonth && transaction.type === 'debit';
      });
      
      const totalSpent = currentMonthTransactions.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
      const spentPercentage = (totalSpent / currentBudget.amount) * 100;
      
      // Add budget warning notifications (only count once per day)
      if (spentPercentage >= 100) {
        // Check if we haven't already shown this alert today
        const budgetAlertShown = localStorage.getItem(`budgetAlert_${user.id}_${today}`);
        if (!budgetAlertShown) {
          todayCount += 1; // Budget exceeded notification
        }
      } else if (spentPercentage >= 80) {
        // Check if we haven't already shown this warning today  
        const budgetWarningShown = localStorage.getItem(`budgetWarning_${user.id}_${today}`);
        if (!budgetWarningShown) {
          todayCount += 1; // Budget warning notification
        }
      }
    }

  } catch (error) {
    console.error('Error calculating today\'s notification count:', error);
    return 0;
  }

  return todayCount;
};

// Generate notification message based on count
export const generateNotificationMessage = (count: number): string => {
  if (count === 0) {
    return "Welcome back! You're all caught up with your finances.";
  } else if (count === 1) {
    return "You have 1 notification waiting for you today.";
  } else {
    return `You have ${count} notifications waiting for you today.`;
  }
};