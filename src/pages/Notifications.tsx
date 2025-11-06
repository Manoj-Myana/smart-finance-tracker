import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bell, CheckCircle, AlertCircle, Info, X, Filter, Plus, Calendar, 
  DollarSign, TrendingUp, Target, Clock, Edit, Trash2, Save, AlertTriangle,
  PiggyBank, CreditCard, HandCoins, Wallet, CalendarCheck
} from 'lucide-react';

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

const Notifications: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [budgetLimits, setBudgetLimits] = useState<BudgetLimit[]>([]);
  const [savingsTargets, setSavingsTargets] = useState<SavingsTarget[]>([]);
  
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [activeTab, setActiveTab] = useState<'notifications' | 'today' | 'reminders' | 'budget' | 'savings'>('today');
  
  // Form states
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showSavingsForm, setShowSavingsForm] = useState(false);
  
  const [reminderForm, setReminderForm] = useState({
    description: '',
    amount: '',
    date: '',
    type: 'pay' as 'collect' | 'pay'
  });
  
  const [budgetForm, setBudgetForm] = useState({
    amount: '',
    month: new Date().toISOString().slice(0, 7) // Current month
  });
  
  const [savingsForm, setSavingsForm] = useState({
    targetAmount: '',
    month: new Date().toISOString().slice(0, 7) // Current month
  });

  // Load user data and transactions
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        fetchTransactions(parsedUser.id);
        loadUserData(parsedUser.id);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const fetchTransactions = async (userId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/transactions/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      } else {
        console.error('Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const loadUserData = (userId: number) => {
    try {
      // Load reminders
      const savedReminders = localStorage.getItem(`reminders_${userId}`);
      if (savedReminders) {
        setReminders(JSON.parse(savedReminders));
      }

      // Load budget limits
      const savedBudgets = localStorage.getItem(`budgetLimits_${userId}`);
      if (savedBudgets) {
        setBudgetLimits(JSON.parse(savedBudgets));
      }

      // Load savings targets
      const savedTargets = localStorage.getItem(`savingsTargets_${userId}`);
      if (savedTargets) {
        setSavingsTargets(JSON.parse(savedTargets));
      }

      // Load notifications
      const savedNotifications = localStorage.getItem(`notifications_${userId}`);
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        })));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Check for budget and savings alerts
  useEffect(() => {
    if (user && transactions.length > 0) {
      checkBudgetAlerts();
      checkSavingsProgress();
      checkReminders();
    }
  }, [transactions, user]);

  const checkBudgetAlerts = useCallback(() => {
    if (!user) return;

    const currentMonth = new Date().toISOString().slice(0, 7);
    
    setBudgetLimits(prevBudgets => {
      const activeBudget = prevBudgets.find(b => b.isActive && b.month === currentMonth);
      
      if (activeBudget) {
        // Calculate current month spending
        const currentMonthSpending = transactions
          .filter(t => 
            t.type === 'debit' && 
            t.date.startsWith(currentMonth)
          )
          .reduce((sum, t) => sum + t.amount, 0);

        // Update current spent
        const updatedBudgets = prevBudgets.map(b =>
          b.id === activeBudget.id ? { ...b, currentSpent: currentMonthSpending } : b
        );
        
        if (user) {
          localStorage.setItem(`budgetLimits_${user.id}`, JSON.stringify(updatedBudgets));
        }

        const spentPercentage = (currentMonthSpending / activeBudget.amount) * 100;

        // Check for 80% warning
        if (spentPercentage >= 80 && spentPercentage < 100) {
          setNotifications(prevNotifications => {
            const existingAlert = prevNotifications.find(n => 
              n.category === 'budget' && 
              n.message.includes('80%') &&
              n.timestamp.toDateString() === new Date().toDateString()
            );

            if (!existingAlert) {
              const newNotification: Notification = {
                id: Date.now().toString(),
                title: 'Budget Alert - 80% Limit Reached',
                message: `You've spent ${spentPercentage.toFixed(1)}% (₹${currentMonthSpending.toFixed(2)}) of your monthly budget (₹${activeBudget.amount}). Consider monitoring your expenses.`,
                type: 'warning',
                timestamp: new Date(),
                read: false,
                category: 'budget'
              };
              
              const updatedNotifications = [...prevNotifications, newNotification];
              if (user) {
                localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updatedNotifications));
              }
              return updatedNotifications;
            }
            return prevNotifications;
          });
        }

        // Check for 100% warning
        if (spentPercentage >= 100) {
          setNotifications(prevNotifications => {
            const existingAlert = prevNotifications.find(n => 
              n.category === 'budget' && 
              n.message.includes('100%') &&
              n.timestamp.toDateString() === new Date().toDateString()
            );

            if (!existingAlert) {
              const newNotification: Notification = {
                id: Date.now().toString() + '_100',
                title: 'Budget Limit Exceeded!',
                message: `You've exceeded your monthly budget! Spent ${spentPercentage.toFixed(1)}% (₹${currentMonthSpending.toFixed(2)}) of your budget (₹${activeBudget.amount}). Immediate attention required.`,
                type: 'error',
                timestamp: new Date(),
                read: false,
                category: 'budget'
              };
              
              const updatedNotifications = [...prevNotifications, newNotification];
              if (user) {
                localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updatedNotifications));
              }
              return updatedNotifications;
            }
            return prevNotifications;
          });
        }

        return updatedBudgets;
      }
      return prevBudgets;
    });
  }, [user, transactions]);

  const checkSavingsProgress = useCallback(() => {
    if (!user) return;

    const currentMonth = new Date().toISOString().slice(0, 7);
    
    setSavingsTargets(prevTargets => {
      const activeTarget = prevTargets.find(t => t.isActive && t.month === currentMonth);
      
      if (activeTarget) {
        // Calculate current month savings (credits - debits)
        const currentMonthCredits = transactions
          .filter(t => 
            t.type === 'credit' && 
            t.date.startsWith(currentMonth)
          )
          .reduce((sum, t) => sum + t.amount, 0);

        const currentMonthDebits = transactions
          .filter(t => 
            t.type === 'debit' && 
            t.date.startsWith(currentMonth)
          )
          .reduce((sum, t) => sum + t.amount, 0);

        const currentSavings = Math.max(0, currentMonthCredits - currentMonthDebits);

        // Update current saved
        const updatedTargets = prevTargets.map(t =>
          t.id === activeTarget.id ? { ...t, currentSaved: currentSavings } : t
        );
        
        if (user) {
          localStorage.setItem(`savingsTargets_${user.id}`, JSON.stringify(updatedTargets));
        }

        const savedPercentage = (currentSavings / activeTarget.targetAmount) * 100;
        const remainingAmount = activeTarget.targetAmount - currentSavings;

        // Only send notification if there's meaningful progress
        if (savedPercentage > 0) {
          setNotifications(prevNotifications => {
            const existingUpdate = prevNotifications.find(n => 
              n.category === 'savings' && 
              n.timestamp.toDateString() === new Date().toDateString()
            );

            if (!existingUpdate) {
              const newNotification: Notification = {
                id: Date.now().toString(),
                title: 'Savings Progress Update',
                message: `You've saved ${savedPercentage.toFixed(1)}% (₹${currentSavings.toFixed(2)}) of your target (₹${activeTarget.targetAmount}). ${remainingAmount > 0 ? `Still need to save ₹${remainingAmount.toFixed(2)} this month.` : 'Congratulations! Target achieved!'}`,
                type: savedPercentage >= 100 ? 'success' : 'info',
                timestamp: new Date(),
                read: false,
                category: 'savings'
              };
              
              const updatedNotifications = [...prevNotifications, newNotification];
              if (user) {
                localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updatedNotifications));
              }
              return updatedNotifications;
            }
            return prevNotifications;
          });
        }

        return updatedTargets;
      }
      return prevTargets;
    });
  }, [user, transactions]);

  const checkReminders = useCallback(() => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    
    setReminders(prevReminders => {
      const upcomingReminders = prevReminders.filter(r => 
        !r.isCompleted && 
        r.date === today
      );

      upcomingReminders.forEach(reminder => {
        setNotifications(prevNotifications => {
          const existingReminder = prevNotifications.find(n => 
            n.category === 'reminder' && 
            n.message.includes(reminder.description) &&
            n.timestamp.toDateString() === new Date().toDateString()
          );

          if (!existingReminder) {
            const newNotification: Notification = {
              id: Date.now().toString() + '_' + reminder.id,
              title: `Payment Reminder - ${reminder.type === 'collect' ? 'Collect Money' : 'Pay Money'}`,
              message: `${reminder.description} - ₹${reminder.amount} is due today.`,
              type: 'warning',
              timestamp: new Date(),
              read: false,
              category: 'reminder'
            };
            
            const updatedNotifications = [...prevNotifications, newNotification];
            if (user) {
              localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updatedNotifications));
            }
            return updatedNotifications;
          }
          return prevNotifications;
        });
      });

      return prevReminders;
    });
  }, [user]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    if (!user) return;

    const newNotification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
      ...notification
    };

    const updatedNotifications = [newNotification, ...notifications].slice(0, 50); // Keep only latest 50
    setNotifications(updatedNotifications);
    localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updatedNotifications));
  };

  // Reminder functions
  const handleAddReminder = () => {
    if (!user || !reminderForm.description || !reminderForm.amount || !reminderForm.date) {
      alert('Please fill all fields');
      return;
    }

    const newReminder: Reminder = {
      id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      description: reminderForm.description,
      amount: parseFloat(reminderForm.amount),
      date: reminderForm.date,
      type: reminderForm.type,
      isCompleted: false,
      createdAt: new Date().toISOString()
    };

    const updatedReminders = [...reminders, newReminder];
    setReminders(updatedReminders);
    localStorage.setItem(`reminders_${user.id}`, JSON.stringify(updatedReminders));

    // Reset form
    setReminderForm({
      description: '',
      amount: '',
      date: '',
      type: 'pay'
    });
    setShowReminderForm(false);

    addNotification({
      title: 'Reminder Added',
      message: `Reminder for ${newReminder.description} (₹${newReminder.amount}) set for ${new Date(newReminder.date).toLocaleDateString()}.`,
      type: 'success',
      category: 'reminder'
    });
  };

  const toggleReminderComplete = (id: string) => {
    if (!user) return;

    const updatedReminders = reminders.map(r =>
      r.id === id ? { ...r, isCompleted: !r.isCompleted } : r
    );
    setReminders(updatedReminders);
    localStorage.setItem(`reminders_${user.id}`, JSON.stringify(updatedReminders));
  };

  const deleteReminder = (id: string) => {
    if (!user) return;

    const updatedReminders = reminders.filter(r => r.id !== id);
    setReminders(updatedReminders);
    localStorage.setItem(`reminders_${user.id}`, JSON.stringify(updatedReminders));
  };

  // Budget functions
  const handleAddBudget = () => {
    if (!user || !budgetForm.amount || !budgetForm.month) {
      alert('Please fill all fields');
      return;
    }

    // Deactivate existing budget for the same month
    const updatedExistingBudgets = budgetLimits.map(b =>
      b.month === budgetForm.month ? { ...b, isActive: false } : b
    );

    const newBudget: BudgetLimit = {
      id: `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: parseFloat(budgetForm.amount),
      month: budgetForm.month,
      currentSpent: 0,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const updatedBudgets = [...updatedExistingBudgets, newBudget];
    setBudgetLimits(updatedBudgets);
    localStorage.setItem(`budgetLimits_${user.id}`, JSON.stringify(updatedBudgets));

    // Reset form
    setBudgetForm({
      amount: '',
      month: new Date().toISOString().slice(0, 7)
    });
    setShowBudgetForm(false);

    addNotification({
      title: 'Budget Limit Set',
      message: `Monthly budget of ₹${newBudget.amount} set for ${new Date(newBudget.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`,
      type: 'success',
      category: 'budget'
    });
  };

  // Savings functions
  const handleAddSavingsTarget = () => {
    if (!user || !savingsForm.targetAmount || !savingsForm.month) {
      alert('Please fill all fields');
      return;
    }

    // Deactivate existing target for the same month
    const updatedExistingTargets = savingsTargets.map(t =>
      t.month === savingsForm.month ? { ...t, isActive: false } : t
    );

    const newTarget: SavingsTarget = {
      id: `target_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      targetAmount: parseFloat(savingsForm.targetAmount),
      currentSaved: 0,
      month: savingsForm.month,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const updatedTargets = [...updatedExistingTargets, newTarget];
    setSavingsTargets(updatedTargets);
    localStorage.setItem(`savingsTargets_${user.id}`, JSON.stringify(updatedTargets));

    // Reset form
    setSavingsForm({
      targetAmount: '',
      month: new Date().toISOString().slice(0, 7)
    });
    setShowSavingsForm(false);

    addNotification({
      title: 'Savings Target Set',
      message: `Savings target of ₹${newTarget.targetAmount} set for ${new Date(newTarget.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`,
      type: 'success',
      category: 'savings'
    });
  };

  // Notification functions
  const markAsRead = (id: string) => {
    if (!user) return;

    const updatedNotifications = notifications.map(notification => 
      notification.id === id 
        ? { ...notification, read: true }
        : notification
    );
    setNotifications(updatedNotifications);
    localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updatedNotifications));
  };

  const markAllAsRead = () => {
    if (!user) return;

    const updatedNotifications = notifications.map(notification => ({ ...notification, read: true }));
    setNotifications(updatedNotifications);
    localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updatedNotifications));
  };

  const deleteNotification = (id: string) => {
    if (!user) return;

    const updatedNotifications = notifications.filter(notification => notification.id !== id);
    setNotifications(updatedNotifications);
    localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updatedNotifications));
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'read':
        return notifications.filter(n => n.read);
      default:
        return notifications;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500 bg-green-50/50';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50/50';
      case 'error':
        return 'border-l-red-500 bg-red-50/50';
      default:
        return 'border-l-blue-500 bg-blue-50/50';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentBudget = budgetLimits.find(b => b.isActive && b.month === currentMonth);
  const currentTarget = savingsTargets.find(t => t.isActive && t.month === currentMonth);
  
  // Get today's reminders count
  const today = new Date().toISOString().split('T')[0];
  const todayRemindersCount = reminders.filter(r => r.date === today && !r.isCompleted).length;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '24px',
      fontFamily: '"Inter", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px'
          }}>
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
              borderRadius: '20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.1)',
              border: '2px solid rgba(255,255,255,0.2)',
              position: 'relative'
            }}>
              <Bell style={{ height: '40px', width: '40px', color: '#667eea' }} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '12px',
                  borderRadius: '50%',
                  height: '24px',
                  width: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
          <h1 style={{
            fontSize: '48px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '12px',
            textShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }}>
            Notifications & Reminders
          </h1>
          <p style={{
            color: '#e2e8f0',
            fontSize: '20px',
            fontWeight: '400',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            Stay on top of your finances with smart alerts and reminders
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '32px'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            padding: '8px',
            display: 'flex',
            gap: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
          }}>
            {[
              { id: 'notifications' as const, label: 'Notifications', icon: Bell, count: unreadCount },
              { id: 'today' as const, label: 'Today\'s Reminders', icon: CalendarCheck, count: todayRemindersCount },
              { id: 'reminders' as const, label: 'All Reminders', icon: Clock, count: reminders.length },
              { id: 'budget' as const, label: 'Budget', icon: Wallet },
              { id: 'savings' as const, label: 'Savings', icon: PiggyBank }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: activeTab === tab.id 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                      : 'transparent',
                    color: activeTab === tab.id ? '#ffffff' : '#667eea',
                    fontWeight: '600',
                    fontSize: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Icon style={{ height: '18px', width: '18px' }} />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span style={{
                      background: activeTab === tab.id ? 'rgba(255,255,255,0.3)' : '#ef4444',
                      color: activeTab === tab.id ? '#ffffff' : '#ffffff',
                      fontSize: '12px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      marginLeft: '4px',
                      minWidth: '18px',
                      textAlign: 'center'
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {/* Content based on active tab */}
        {activeTab === 'notifications' && (
          <div>
            {/* Controls */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: window.innerWidth < 768 ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px'
              }}>
                {/* Filter Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Filter style={{ height: '20px', width: '20px', color: '#64748b' }} />
                  {[
                    { id: 'all', label: `All (${notifications.length})` },
                    { id: 'unread', label: `Unread (${unreadCount})` },
                    { id: 'read', label: `Read (${notifications.length - unreadCount})` }
                  ].map((filterOption) => (
                    <button
                      key={filterOption.id}
                      onClick={() => setFilter(filterOption.id as 'all' | 'unread' | 'read')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '12px',
                        border: 'none',
                        background: filter === filterOption.id
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : '#f1f5f9',
                        color: filter === filterOption.id ? '#ffffff' : '#64748b',
                        fontWeight: '600',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {filterOption.label}
                    </button>
                  ))}
                </div>

                {/* Mark All Read Button */}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      borderRadius: '12px',
                      border: 'none',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Mark All as Read
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {getFilteredNotifications().length === 0 ? (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '24px',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
                  padding: '48px',
                  textAlign: 'center'
                }}>
                  <Bell style={{ height: '64px', width: '64px', color: '#cbd5e1', margin: '0 auto 24px' }} />
                  <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#64748b', marginBottom: '12px' }}>
                    No Notifications
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '16px' }}>
                    {filter === 'unread' 
                      ? "You're all caught up! No unread notifications."
                      : filter === 'read'
                      ? "No read notifications found."
                      : "You don't have any notifications yet."
                    }
                  </p>
                </div>
              ) : (
                getFilteredNotifications().map((notification) => (
                  <div
                    key={notification.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '24px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      borderLeft: `4px solid ${notification.type === 'success' ? '#10b981' : notification.type === 'warning' ? '#f59e0b' : notification.type === 'error' ? '#ef4444' : '#3b82f6'}`,
                      padding: '24px',
                      transition: 'all 0.3s ease',
                      border: !notification.read ? '2px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(226, 232, 240, 0.3)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
                        {getNotificationIcon(notification.type)}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a202c', margin: 0 }}>
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <span style={{
                                background: '#3b82f6',
                                height: '8px',
                                width: '8px',
                                borderRadius: '50%'
                              }}></span>
                            )}
                          </div>
                          <p style={{ color: '#64748b', fontSize: '16px', marginBottom: '12px', lineHeight: '1.5' }}>
                            {notification.message}
                          </p>
                          <p style={{ fontSize: '14px', color: '#94a3b8' }}>
                            {notification.timestamp.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            style={{
                              color: '#3b82f6',
                              fontSize: '14px',
                              fontWeight: '600',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                          >
                            Mark as Read
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          style={{
                            color: '#64748b',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '6px',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                        >
                          <X style={{ height: '20px', width: '20px' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Today's Reminders Tab */}
        {activeTab === 'today' && (
          <div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
              padding: '32px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a202c', margin: 0 }}>
                  Today's Reminders
                </h2>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  borderRadius: '12px',
                  border: '1px solid #0ea5e9'
                }}>
                  <CalendarCheck style={{ height: '16px', width: '16px', color: '#0c4a6e' }} />
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#0c4a6e' }}>
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              </div>

              {/* Today's Reminders List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const todayReminders = reminders
                    .filter(r => r.date === today)
                    .sort((a, b) => {
                      // Sort by completion status first (non-completed first)
                      if (a.isCompleted !== b.isCompleted) {
                        return a.isCompleted ? 1 : -1;
                      }
                      // Then sort by date in increasing order
                      return new Date(a.date).getTime() - new Date(b.date).getTime();
                    });
                  
                  if (todayReminders.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '48px 32px', color: '#64748b' }}>
                        <CalendarCheck style={{ height: '64px', width: '64px', color: '#cbd5e1', margin: '0 auto 24px' }} />
                        <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px' }}>
                          No Reminders for Today
                        </h3>
                        <p style={{ fontSize: '16px', marginBottom: '24px' }}>
                          You're all caught up! No payment reminders are due today.
                        </p>
                        <button
                          onClick={() => setActiveTab('reminders')}
                          style={{
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            margin: '0 auto'
                          }}
                        >
                          <Plus style={{ height: '18px', width: '18px' }} />
                          Add New Reminder
                        </button>
                      </div>
                    );
                  }
                  
                  return todayReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '20px',
                        background: reminder.isCompleted 
                          ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' 
                          : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        border: reminder.isCompleted 
                          ? '2px solid #16a34a' 
                          : '2px solid #f59e0b',
                        borderRadius: '16px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        opacity: reminder.isCompleted ? 0.7 : 1,
                        transform: reminder.isCompleted ? 'scale(0.98)' : 'scale(1)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                        <div style={{
                          padding: '12px',
                          background: reminder.type === 'collect' 
                            ? (reminder.isCompleted ? '#dcfce7' : '#ecfdf5')
                            : (reminder.isCompleted ? '#fef3c7' : '#fefce8'),
                          borderRadius: '12px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          {reminder.type === 'collect' ? 
                            <HandCoins style={{ height: '24px', width: '24px', color: '#16a34a' }} /> :
                            <CreditCard style={{ height: '24px', width: '24px', color: '#ca8a04' }} />
                          }
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{
                            fontSize: '18px',
                            fontWeight: '700',
                            color: '#1a202c',
                            margin: '0 0 6px 0',
                            textDecoration: reminder.isCompleted ? 'line-through' : 'none'
                          }}>
                            {reminder.description}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <p style={{ 
                              fontSize: '16px', 
                              fontWeight: '700',
                              color: reminder.type === 'collect' ? '#16a34a' : '#ca8a04',
                              margin: 0,
                              padding: '4px 12px',
                              background: reminder.type === 'collect' ? '#f0fdf4' : '#fefce8',
                              borderRadius: '8px',
                              border: `1px solid ${reminder.type === 'collect' ? '#16a34a' : '#ca8a04'}`
                            }}>
                              {formatCurrency(reminder.amount)}
                            </p>
                            <p style={{ 
                              fontSize: '14px', 
                              color: '#64748b', 
                              margin: 0,
                              padding: '4px 8px',
                              background: 'rgba(255,255,255,0.7)',
                              borderRadius: '6px'
                            }}>
                              {reminder.type === 'collect' ? 'TO COLLECT' : 'TO PAY'}
                            </p>
                            {reminder.isCompleted && (
                              <p style={{ 
                                fontSize: '12px', 
                                color: '#16a34a', 
                                margin: 0,
                                padding: '4px 8px',
                                background: '#f0fdf4',
                                borderRadius: '6px',
                                fontWeight: '600',
                                border: '1px solid #16a34a'
                              }}>
                                ✓ COMPLETED
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                          onClick={() => toggleReminderComplete(reminder.id)}
                          style={{
                            padding: '10px 16px',
                            background: reminder.isCompleted 
                              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                              : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                        >
                          {reminder.isCompleted ? 'Undo' : 'Complete'}
                        </button>
                        <button
                          onClick={() => deleteReminder(reminder.id)}
                          style={{
                            padding: '10px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#dc2626',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#fef2f2';
                            e.currentTarget.style.borderColor = '#dc2626';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                          }}
                        >
                          <Trash2 style={{ height: '16px', width: '16px' }} />
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {/* Quick Add Reminder for Today */}
              <div style={{
                marginTop: '24px',
                padding: '20px',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: '16px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a202c', marginBottom: '16px' }}>
                  Quick Actions
                </h3>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setActiveTab('reminders')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    <Plus style={{ height: '16px', width: '16px' }} />
                    Add New Reminder
                  </button>
                  <button
                    onClick={() => setActiveTab('reminders')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      background: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '10px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    <Clock style={{ height: '16px', width: '16px' }} />
                    View All Reminders
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Reminders Tab */}
        {activeTab === 'reminders' && (
          <div>
            {/* Add Reminder Section */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
              padding: '32px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a202c', margin: 0 }}>
                  All Payment Reminders
                </h2>
                <button
                  onClick={() => setShowReminderForm(!showReminderForm)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <Plus style={{ height: '18px', width: '18px' }} />
                  Add Reminder
                </button>
              </div>

              {showReminderForm && (
                <div style={{
                  background: '#f8fafc',
                  padding: '24px',
                  borderRadius: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Description
                      </label>
                      <input
                        type="text"
                        value={reminderForm.description}
                        onChange={(e) => setReminderForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="e.g., Electric bill payment"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '16px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Amount
                      </label>
                      <input
                        type="number"
                        value={reminderForm.amount}
                        onChange={(e) => setReminderForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '16px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Date
                      </label>
                      <input
                        type="date"
                        value={reminderForm.date}
                        onChange={(e) => setReminderForm(prev => ({ ...prev, date: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '16px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Type
                      </label>
                      <select
                        value={reminderForm.type}
                        onChange={(e) => setReminderForm(prev => ({ ...prev, type: e.target.value as 'collect' | 'pay' }))}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '16px'
                        }}
                      >
                        <option value="pay">Pay Money</option>
                        <option value="collect">Collect Money</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={handleAddReminder}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 20px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      <Save style={{ height: '16px', width: '16px' }} />
                      Save Reminder
                    </button>
                    <button
                      onClick={() => setShowReminderForm(false)}
                      style={{
                        padding: '12px 20px',
                        background: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Reminders List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reminders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    <Clock style={{ height: '48px', width: '48px', color: '#cbd5e1', margin: '0 auto 16px' }} />
                    <p style={{ fontSize: '16px', fontWeight: '600' }}>No reminders set</p>
                    <p style={{ fontSize: '14px' }}>Add your first payment reminder to get started</p>
                  </div>
                ) : (
                  reminders
                    .sort((a, b) => {
                      // Sort by completion status first (non-completed first)
                      if (a.isCompleted !== b.isCompleted) {
                        return a.isCompleted ? 1 : -1;
                      }
                      // Then sort by date in increasing order
                      return new Date(a.date).getTime() - new Date(b.date).getTime();
                    })
                    .map((reminder) => (
                    <div
                      key={reminder.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        background: reminder.isCompleted ? '#f0fdf4' : '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        opacity: reminder.isCompleted ? 0.7 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                        <div style={{
                          padding: '8px',
                          background: reminder.type === 'collect' ? '#dcfce7' : '#fef3c7',
                          borderRadius: '8px'
                        }}>
                          {reminder.type === 'collect' ? 
                            <HandCoins style={{ height: '20px', width: '20px', color: '#16a34a' }} /> :
                            <CreditCard style={{ height: '20px', width: '20px', color: '#ca8a04' }} />
                          }
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#1a202c',
                            margin: '0 0 4px 0',
                            textDecoration: reminder.isCompleted ? 'line-through' : 'none'
                          }}>
                            {reminder.description}
                          </h4>
                          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                            {formatCurrency(reminder.amount)} • {new Date(reminder.date).toLocaleDateString()} • 
                            <span style={{ 
                              color: reminder.type === 'collect' ? '#16a34a' : '#ca8a04',
                              fontWeight: '600',
                              marginLeft: '4px'
                            }}>
                              {reminder.type === 'collect' ? 'Collect' : 'Pay'}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => toggleReminderComplete(reminder.id)}
                          style={{
                            padding: '8px 12px',
                            background: reminder.isCompleted ? '#f59e0b' : '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          {reminder.isCompleted ? 'Undo' : 'Complete'}
                        </button>
                        <button
                          onClick={() => deleteReminder(reminder.id)}
                          style={{
                            padding: '8px',
                            background: 'transparent',
                            color: '#64748b',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                        >
                          <Trash2 style={{ height: '16px', width: '16px' }} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Budget Tab */}
        {activeTab === 'budget' && (
          <div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
              padding: '32px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a202c', margin: 0 }}>
                  Budget Management
                </h2>
                <button
                  onClick={() => setShowBudgetForm(!showBudgetForm)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <Plus style={{ height: '18px', width: '18px' }} />
                  Set Budget
                </button>
              </div>

              {/* Current Budget Status */}
              {currentBudget && (
                <div style={{
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  padding: '24px',
                  borderRadius: '16px',
                  marginBottom: '24px',
                  border: '1px solid #0ea5e9'
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0c4a6e', marginBottom: '16px' }}>
                    Current Month Budget Status
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
                    <div>
                      <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 4px 0' }}>Budget Limit</p>
                      <p style={{ fontSize: '20px', fontWeight: '700', color: '#0c4a6e', margin: 0 }}>
                        {formatCurrency(currentBudget.amount)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 4px 0' }}>Spent</p>
                      <p style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626', margin: 0 }}>
                        {formatCurrency(currentBudget.currentSpent)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 4px 0' }}>Remaining</p>
                      <p style={{ fontSize: '20px', fontWeight: '700', color: '#059669', margin: 0 }}>
                        {formatCurrency(Math.max(0, currentBudget.amount - currentBudget.currentSpent))}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Progress</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>
                        {((currentBudget.currentSpent / currentBudget.amount) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{
                      background: '#e5e7eb',
                      height: '8px',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        background: (currentBudget.currentSpent / currentBudget.amount) >= 1 ? '#dc2626' :
                                  (currentBudget.currentSpent / currentBudget.amount) >= 0.8 ? '#f59e0b' : '#059669',
                        height: '100%',
                        width: `${Math.min(100, (currentBudget.currentSpent / currentBudget.amount) * 100)}%`,
                        transition: 'all 0.3s ease'
                      }}></div>
                    </div>
                  </div>
                </div>
              )}

              {showBudgetForm && (
                <div style={{
                  background: '#f8fafc',
                  padding: '24px',
                  borderRadius: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Budget Amount
                      </label>
                      <input
                        type="number"
                        value={budgetForm.amount}
                        onChange={(e) => setBudgetForm(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '16px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Month
                      </label>
                      <input
                        type="month"
                        value={budgetForm.month}
                        onChange={(e) => setBudgetForm(prev => ({ ...prev, month: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '16px'
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={handleAddBudget}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 20px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      <Save style={{ height: '16px', width: '16px' }} />
                      Set Budget
                    </button>
                    <button
                      onClick={() => setShowBudgetForm(false)}
                      style={{
                        padding: '12px 20px',
                        background: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Budget History */}
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a202c', marginBottom: '16px' }}>
                  Budget History
                </h3>
                {budgetLimits.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    <Wallet style={{ height: '48px', width: '48px', color: '#cbd5e1', margin: '0 auto 16px' }} />
                    <p style={{ fontSize: '16px', fontWeight: '600' }}>No budget limits set</p>
                    <p style={{ fontSize: '14px' }}>Set your first budget to track spending</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {budgetLimits.map((budget) => (
                      <div
                        key={budget.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px',
                          background: budget.isActive ? '#ecfdf5' : '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px'
                        }}
                      >
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a202c', margin: '0 0 4px 0' }}>
                            {new Date(budget.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </h4>
                          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                            Limit: {formatCurrency(budget.amount)} • 
                            Spent: {formatCurrency(budget.currentSpent)} • 
                            <span style={{ 
                              color: budget.isActive ? '#059669' : '#64748b',
                              fontWeight: '600',
                              marginLeft: '4px'
                            }}>
                              {budget.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </p>
                        </div>
                        <div style={{
                          padding: '4px 12px',
                          background: budget.currentSpent > budget.amount ? '#fef2f2' : '#f0fdf4',
                          color: budget.currentSpent > budget.amount ? '#dc2626' : '#059669',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {budget.currentSpent > budget.amount ? 'Over Budget' : 'Within Budget'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Savings Tab */}
        {activeTab === 'savings' && (
          <div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
              padding: '32px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a202c', margin: 0 }}>
                  Savings Targets
                </h2>
                <button
                  onClick={() => setShowSavingsForm(!showSavingsForm)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <Plus style={{ height: '18px', width: '18px' }} />
                  Set Target
                </button>
              </div>

              {/* Current Savings Status */}
              {currentTarget && (
                <div style={{
                  background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)',
                  padding: '24px',
                  borderRadius: '16px',
                  marginBottom: '24px',
                  border: '1px solid #f59e0b'
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#92400e', marginBottom: '16px' }}>
                    Current Month Savings Progress
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
                    <div>
                      <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 4px 0' }}>Target Amount</p>
                      <p style={{ fontSize: '20px', fontWeight: '700', color: '#92400e', margin: 0 }}>
                        {formatCurrency(currentTarget.targetAmount)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 4px 0' }}>Saved</p>
                      <p style={{ fontSize: '20px', fontWeight: '700', color: '#059669', margin: 0 }}>
                        {formatCurrency(currentTarget.currentSaved)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 4px 0' }}>Remaining</p>
                      <p style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626', margin: 0 }}>
                        {formatCurrency(Math.max(0, currentTarget.targetAmount - currentTarget.currentSaved))}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Progress</span>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>
                        {((currentTarget.currentSaved / currentTarget.targetAmount) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{
                      background: '#e5e7eb',
                      height: '8px',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        background: (currentTarget.currentSaved / currentTarget.targetAmount) >= 1 ? '#059669' : '#3b82f6',
                        height: '100%',
                        width: `${Math.min(100, (currentTarget.currentSaved / currentTarget.targetAmount) * 100)}%`,
                        transition: 'all 0.3s ease'
                      }}></div>
                    </div>
                  </div>
                </div>
              )}

              {showSavingsForm && (
                <div style={{
                  background: '#f8fafc',
                  padding: '24px',
                  borderRadius: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Target Amount
                      </label>
                      <input
                        type="number"
                        value={savingsForm.targetAmount}
                        onChange={(e) => setSavingsForm(prev => ({ ...prev, targetAmount: e.target.value }))}
                        placeholder="0.00"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '16px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                        Month
                      </label>
                      <input
                        type="month"
                        value={savingsForm.month}
                        onChange={(e) => setSavingsForm(prev => ({ ...prev, month: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '16px'
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={handleAddSavingsTarget}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 20px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      <Save style={{ height: '16px', width: '16px' }} />
                      Set Target
                    </button>
                    <button
                      onClick={() => setShowSavingsForm(false)}
                      style={{
                        padding: '12px 20px',
                        background: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Savings History */}
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a202c', marginBottom: '16px' }}>
                  Savings History
                </h3>
                {savingsTargets.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    <PiggyBank style={{ height: '48px', width: '48px', color: '#cbd5e1', margin: '0 auto 16px' }} />
                    <p style={{ fontSize: '16px', fontWeight: '600' }}>No savings targets set</p>
                    <p style={{ fontSize: '14px' }}>Set your first savings target to track progress</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {savingsTargets.map((target) => (
                      <div
                        key={target.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px',
                          background: target.isActive ? '#f0fdf4' : '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px'
                        }}
                      >
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a202c', margin: '0 0 4px 0' }}>
                            {new Date(target.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </h4>
                          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                            Target: {formatCurrency(target.targetAmount)} • 
                            Saved: {formatCurrency(target.currentSaved)} • 
                            <span style={{ 
                              color: target.isActive ? '#059669' : '#64748b',
                              fontWeight: '600',
                              marginLeft: '4px'
                            }}>
                              {target.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </p>
                        </div>
                        <div style={{
                          padding: '4px 12px',
                          background: target.currentSaved >= target.targetAmount ? '#f0fdf4' : '#fef3c7',
                          color: target.currentSaved >= target.targetAmount ? '#059669' : '#92400e',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {target.currentSaved >= target.targetAmount ? 'Target Achieved' : 'In Progress'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;