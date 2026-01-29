import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Calendar, Trophy, Target, TrendingUp, CheckCircle, Activity, Zap, Star, Lock } from 'lucide-react';
import Toast from '../components/Toast';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  streakType: string;
  lastActivity: Date;
}

interface DailyGoal {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  icon: React.ReactNode;
  color: string;
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

interface UserType {
  id: number;
  fullName: string;
  email: string;
}

const Streak: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    totalDays: 0,
    streakType: 'Financial Tracking',
    lastActivity: new Date()
  });

  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([
    {
      id: 1,
      title: 'Log Daily Expenses',
      description: 'Record at least one transaction today',
      completed: false,
      icon: <TrendingUp className="h-5 w-5" />,
      color: '#3b82f6'
    },
    {
      id: 2,
      title: 'Check Budget Status',
      description: 'Review your budget progress',
      completed: false,
      icon: <Target className="h-5 w-5" />,
      color: '#8b5cf6'
    },
    {
      id: 3,
      title: 'Review AI Suggestions',
      description: 'Check personalized financial insights',
      completed: false,
      icon: <Trophy className="h-5 w-5" />,
      color: '#f97316'
    },
    {
      id: 4,
      title: 'Set Financial Goal',
      description: 'Update or create a new savings goal',
      completed: false,
      icon: <Calendar className="h-5 w-5" />,
      color: '#10b981'
    }
  ]);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('userData');
    const token = localStorage.getItem('authToken');

    if (!userData || !token) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchTransactions(parsedUser.id);
      calculateDailyGoals();
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate]);

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
        const transactionsList = Array.isArray(data) ? data : (data.transactions || []);
        setTransactions(transactionsList);
        calculateStreakData(transactionsList);
      } else {
        console.error('Failed to fetch transactions');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  };

  const calculateStreakData = (transactionsList: Transaction[]) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Group transactions by date
      const transactionsByDate = new Map<string, Transaction[]>();
      const uniqueDates = new Set<string>();

      transactionsList.forEach(transaction => {
        const date = transaction.date || transaction.created_at;
        const dateOnly = date.split('T')[0];
        uniqueDates.add(dateOnly);

        if (!transactionsByDate.has(dateOnly)) {
          transactionsByDate.set(dateOnly, []);
        }
        transactionsByDate.get(dateOnly)?.push(transaction);
      });

      // Calculate streak
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      const sortedDates = Array.from(uniqueDates).sort().reverse();

      let checkDate = new Date(today);

      for (const dateStr of sortedDates) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const transactionDate = new Date(year, month - 1, day);
        transactionDate.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(checkDate.getTime() - transactionDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0 || diffDays === 1) {
          tempStreak++;
          checkDate = transactionDate;
        } else {
          break;
        }
      }

      currentStreak = tempStreak;

      // Calculate longest streak
      tempStreak = 1;
      for (let i = 0; i < sortedDates.length - 1; i++) {
        const [year1, month1, day1] = sortedDates[i].split('-').map(Number);
        const [year2, month2, day2] = sortedDates[i + 1].split('-').map(Number);

        const date1 = new Date(year1, month1 - 1, day1);
        const date2 = new Date(year2, month2 - 1, day2);

        const diffTime = Math.abs(date1.getTime() - date2.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      const lastActivityDate = sortedDates.length > 0 ? new Date(sortedDates[0]) : today;

      setStreakData({
        currentStreak,
        longestStreak: Math.max(longestStreak, currentStreak),
        totalDays: uniqueDates.size,
        streakType: 'Financial Tracking',
        lastActivity: lastActivityDate
      });

      // Check if today has a transaction for daily goals
      const todayStr = today.toISOString().split('T')[0];
      const hasTodayTransaction = uniqueDates.has(todayStr);
      
      if (hasTodayTransaction) {
        setDailyGoals(prev => [
          { ...prev[0], completed: true },
          ...prev.slice(1)
        ]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error calculating streak:', error);
      setLoading(false);
    }
  };

  const calculateDailyGoals = () => {
    // This function can be enhanced with more logic
    // For now, we'll just initialize it
  };

  const toggleGoal = (id: number) => {
    setDailyGoals(prev => 
      prev.map(goal => 
        goal.id === id ? { ...goal, completed: !goal.completed } : goal
      )
    );
  };

  const completedGoals = dailyGoals.filter(goal => goal.completed).length;
  const progressPercentage = (completedGoals / dailyGoals.length) * 100;

  const getStreakLevel = (streak: number) => {
    if (streak >= 30) return { level: 'Expert', color: '#dc2626', emoji: '🔥' };
    if (streak >= 20) return { level: 'Advanced', color: '#ea580c', emoji: '⚡' };
    if (streak >= 10) return { level: 'Intermediate', color: '#d97706', emoji: '🌟' };
    if (streak >= 5) return { level: 'Beginner', color: '#65a30d', emoji: '🌱' };
    return { level: 'Starter', color: '#6b7280', emoji: '🎯' };
  };

  const getMonthlyStats = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let transactionsLogged = 0;
    let budgetChecks = 0;
    let totalAmount = 0;

    transactions.forEach(transaction => {
      const transDate = new Date(transaction.date || transaction.created_at);
      if (transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear) {
        transactionsLogged++;
        totalAmount += transaction.amount;
      }
    });

    // Estimate budget checks and reports (can be enhanced with actual data)
    budgetChecks = Math.min(transactionsLogged, 30);
    const reportsGenerated = Math.max(0, Math.floor(transactionsLogged / 10));

    return { transactionsLogged, budgetChecks, reportsGenerated, totalAmount };
  };

  const currentLevel = getStreakLevel(streakData.currentStreak);
  const monthlyStats = getMonthlyStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg mb-4">
            <Flame className="h-8 w-8 text-white animate-pulse" />
          </div>
          <p className="text-gray-600">Loading your streak data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f5f3ff 100%)',
      padding: '32px 24px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Header Section */}
        <div style={{
          marginBottom: '40px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px'
          }}>
            {/* Logo and Title */}
            <div style={{
              display: 'flex',
              alignItems: 'center'
            }}>
              <div style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
                borderRadius: '20px',
                boxShadow: '0 8px 24px rgba(249, 115, 22, 0.3)',
                marginRight: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Flame style={{ 
                  height: '32px', 
                  width: '32px', 
                  color: 'white' 
                }} />
              </div>
              <div>
                <h1 style={{
                  fontSize: '36px',
                  fontWeight: '800',
                  color: '#1f2937',
                  margin: '0 0 4px 0',
                  background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Financial Streak
                </h1>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: '4px 0 0 0'
                }}>Keep your financial habits consistent and build wealth</p>
              </div>
            </div>

            {/* User Welcome */}
            {user && (
              <div style={{
                textAlign: 'right',
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(12px)',
                padding: '16px 24px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
              }}>
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  margin: '0 0 4px 0'
                }}>Welcome back</p>
                <p style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#1f2937',
                  margin: 0
                }}>{user.fullName}</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Grid Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '24px'
        }}>
          {/* Left Side - Main Content */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {/* Main Streak Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                borderRadius: '24px',
                padding: '48px 32px',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                backgroundImage: `linear-gradient(135deg, ${currentLevel.color}08 0%, ${currentLevel.color}04 100%)`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = `0 20px 48px ${currentLevel.color}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={{ textAlign: 'center' }}>
                {/* Emoji Display */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '32px'
                }}>
                  <div 
                    style={{
                      padding: '24px',
                      borderRadius: '28px',
                      boxShadow: `0 8px 24px ${currentLevel.color}25`,
                      background: `linear-gradient(135deg, ${currentLevel.color}15 0%, ${currentLevel.color}05 100%)`,
                      border: `3px solid ${currentLevel.color}30`,
                      fontSize: '64px',
                      lineHeight: '1'
                    }}
                  >
                    {currentLevel.emoji}
                  </div>
                </div>

                {/* Main Number */}
                <div style={{ marginBottom: '32px' }}>
                  <div style={{
                    fontSize: '72px',
                    fontWeight: '900',
                    color: '#1f2937',
                    margin: '0 0 8px 0',
                    letterSpacing: '-2px'
                  }}>
                    {streakData.currentStreak}
                  </div>
                  <div style={{
                    fontSize: '20px',
                    color: '#6b7280',
                    fontWeight: '600',
                    margin: 0
                  }}>Days Current Streak</div>

                  {/* Level Badge */}
                  <div 
                    style={{
                      display: 'inline-block',
                      marginTop: '16px',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: currentLevel.color,
                      padding: '8px 16px',
                      borderRadius: '20px',
                      background: `${currentLevel.color}15`,
                      border: `2px solid ${currentLevel.color}30`,
                      boxShadow: `0 4px 12px ${currentLevel.color}15`
                    }}
                  >
                    ✨ {currentLevel.level} Level ✨
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginTop: '32px',
                  marginBottom: '24px'
                }}>
                  {/* Longest Streak */}
                  <div
                    style={{
                      padding: '20px',
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(37, 99, 235, 0.02) 100%)',
                      borderRadius: '18px',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 12px 24px rgba(59, 130, 246, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      fontSize: '28px',
                      fontWeight: '800',
                      color: '#3b82f6',
                      margin: '0 0 4px 0'
                    }}>
                      {streakData.longestStreak}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#2563eb',
                      fontWeight: '600',
                      margin: 0
                    }}>Longest Streak</div>
                  </div>

                  {/* Total Active Days */}
                  <div
                    style={{
                      padding: '20px',
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(124, 58, 202, 0.02) 100%)',
                      borderRadius: '18px',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 12px 24px rgba(139, 92, 246, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{
                      fontSize: '28px',
                      fontWeight: '800',
                      color: '#8b5cf6',
                      margin: '0 0 4px 0'
                    }}>
                      {streakData.totalDays}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#7c3aed',
                      fontWeight: '600',
                      margin: 0
                    }}>Total Active Days</div>
                  </div>
                </div>

                {/* Last Activity */}
                <div style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.05) 0%, rgba(249, 115, 22, 0.02) 100%)',
                  borderRadius: '16px',
                  border: '1px solid rgba(251, 146, 60, 0.2)',
                  marginTop: '16px'
                }}>
                  <p style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    margin: '0 0 4px 0'
                  }}>Last Activity</p>
                  <p style={{
                    fontSize: '15px',
                    fontWeight: '700',
                    color: '#1f2937',
                    margin: 0
                  }}>
                    {streakData.lastActivity.toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Daily Goals */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                borderRadius: '24px',
                padding: '32px',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 48px rgba(0, 0, 0, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.1)';
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <h3 style={{
                  fontSize: '22px',
                  fontWeight: '800',
                  color: '#1f2937',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Target style={{ height: '24px', width: '24px', color: '#4f46e5' }} />
                  Today's Goals
                </h3>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
                  color: '#4f46e5',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  border: '1px solid rgba(79, 70, 229, 0.2)'
                }}>
                  {completedGoals}/{dailyGoals.length} completed
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#4b5563',
                    letterSpacing: '0.025em'
                  }}>Daily Progress</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '800',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '12px',
                  background: '#e5e7eb',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)'
                }}>
                  <div 
                    style={{
                      height: '100%',
                      width: `${progressPercentage}%`,
                      borderRadius: '12px',
                      transition: 'width 0.5s ease-out',
                      background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #f97316 100%)',
                      boxShadow: '0 0 16px rgba(59, 130, 246, 0.3)'
                    }}
                  />
                </div>
              </div>

              {/* Goals List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dailyGoals.map((goal) => (
                  <div
                    key={goal.id}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      border: goal.completed ? '2px solid rgba(34, 197, 94, 0.4)' : '2px solid #e5e7eb',
                      background: goal.completed 
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%)'
                        : '#f9fafb',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                    onClick={() => toggleGoal(goal.id)}
                    onMouseEnter={(e) => {
                      if (!goal.completed) {
                        e.currentTarget.style.background = '#f3f4f6';
                        e.currentTarget.style.borderColor = '#d1d5db';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!goal.completed) {
                        e.currentTarget.style.background = '#f9fafb';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }
                    }}
                  >
                    <div 
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        background: goal.completed ? 'rgba(34, 197, 94, 0.15)' : '#ffffff',
                        boxShadow: goal.completed ? '0 2px 8px rgba(34, 197, 94, 0.1)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: goal.completed ? '#22c55e' : goal.color,
                        minWidth: '44px',
                        minHeight: '44px'
                      }}
                    >
                      {goal.completed ? <CheckCircle style={{ height: '20px', width: '20px' }} /> : goal.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{
                        fontSize: '15px',
                        fontWeight: '700',
                        color: goal.completed ? '#22c55e' : '#1f2937',
                        margin: '0 0 4px 0'
                      }}>
                        {goal.title}
                      </h4>
                      <p style={{
                        fontSize: '13px',
                        color: goal.completed ? '#16a34a' : '#6b7280',
                        margin: 0
                      }}>
                        {goal.description}
                      </p>
                    </div>
                    {goal.completed && (
                      <Zap style={{ height: '20px', width: '20px', color: '#22c55e' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Activity */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                borderRadius: '24px',
                padding: '32px',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 48px rgba(0, 0, 0, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.1)';
              }}
            >
              <h3 style={{
                fontSize: '22px',
                fontWeight: '800',
                color: '#1f2937',
                margin: '0 0 24px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Activity style={{ height: '24px', width: '24px', color: '#22c55e' }} />
                Monthly Activity
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px'
              }}>
                <div
                  style={{
                    padding: '20px',
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%)',
                    borderRadius: '16px',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <span style={{
                      fontSize: '13px',
                      color: '#4b5563',
                      fontWeight: '600'
                    }}>Transactions Logged</span>
                    <TrendingUp style={{ height: '18px', width: '18px', color: '#22c55e' }} />
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    color: '#22c55e',
                    margin: 0
                  }}>{monthlyStats.transactionsLogged}</div>
                  <p style={{
                    fontSize: '12px',
                    color: '#16a34a',
                    marginTop: '4px',
                    margin: '4px 0 0 0'
                  }}>This month so far</p>
                </div>

                <div
                  style={{
                    padding: '20px',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.04) 100%)',
                    borderRadius: '16px',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <span style={{
                      fontSize: '13px',
                      color: '#4b5563',
                      fontWeight: '600'
                    }}>Total Amount</span>
                    <Star style={{ height: '18px', width: '18px', color: '#3b82f6' }} />
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    color: '#3b82f6',
                    margin: 0
                  }}>₹{monthlyStats.totalAmount.toLocaleString()}</div>
                  <p style={{
                    fontSize: '12px',
                    color: '#2563eb',
                    margin: '4px 0 0 0'
                  }}>Total transaction value</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {/* Streak Tips */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 48px rgba(0, 0, 0, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.1)';
              }}
            >
              <h3 style={{
                fontSize: '16px',
                fontWeight: '800',
                color: '#1f2937',
                margin: '0 0 16px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Trophy style={{ height: '18px', width: '18px', color: '#f59e0b' }} />
                Streak Tips
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  padding: '12px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
                  borderRadius: '12px',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                  <div style={{
                    fontWeight: '700',
                    color: '#1e40af',
                    fontSize: '13px',
                    marginBottom: '4px'
                  }}>Daily Consistency</div>
                  <div style={{
                    fontSize: '12px',
                    color: '#1e3a8a',
                    lineHeight: '1.4'
                  }}>Log at least one transaction daily to maintain your streak</div>
                </div>

                <div style={{
                  padding: '12px',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 202, 0.05) 100%)',
                  borderRadius: '12px',
                  border: '1px solid rgba(139, 92, 246, 0.2)'
                }}>
                  <div style={{
                    fontWeight: '700',
                    color: '#6d28d9',
                    fontSize: '13px',
                    marginBottom: '4px'
                  }}>Weekend Habit</div>
                  <div style={{
                    fontSize: '12px',
                    color: '#5b21b6',
                    lineHeight: '1.4'
                  }}>Don't break the chain on weekends - keep tracking</div>
                </div>

                <div style={{
                  padding: '12px',
                  background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(234, 88, 12, 0.05) 100%)',
                  borderRadius: '12px',
                  border: '1px solid rgba(249, 115, 22, 0.2)'
                }}>
                  <div style={{
                    fontWeight: '700',
                    color: '#92400e',
                    fontSize: '13px',
                    marginBottom: '4px'
                  }}>Goal Setting</div>
                  <div style={{
                    fontSize: '12px',
                    color: '#7c2d12',
                    lineHeight: '1.4'
                  }}>Review and update your financial goals weekly</div>
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 48px rgba(0, 0, 0, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.1)';
              }}
            >
              <h3 style={{
                fontSize: '16px',
                fontWeight: '800',
                color: '#1f2937',
                margin: '0 0 16px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Star style={{ height: '18px', width: '18px', color: '#f59e0b' }} />
                Achievements
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px'
              }}>
                <div style={{
                  textAlign: 'center',
                  padding: '16px',
                  background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)',
                  borderRadius: '14px',
                  border: `2px solid ${streakData.currentStreak >= 7 ? 'rgba(250, 204, 21, 0.3)' : 'rgba(209, 213, 219, 0.3)'}`,
                  opacity: streakData.currentStreak >= 7 ? 1 : 0.5,
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>🏆</div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#1f2937',
                    marginBottom: '4px'
                  }}>First Week</div>
                  <div style={{
                    fontSize: '11px',
                    color: '#6b7280'
                  }}>{streakData.currentStreak >= 7 ? '✓ Unlocked' : 'Locked'}</div>
                </div>

                <div style={{
                  textAlign: 'center',
                  padding: '16px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
                  borderRadius: '14px',
                  border: `2px solid ${streakData.longestStreak >= 14 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(209, 213, 219, 0.3)'}`,
                  opacity: streakData.longestStreak >= 14 ? 1 : 0.5,
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>💎</div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#1f2937',
                    marginBottom: '4px'
                  }}>Two Weeks</div>
                  <div style={{
                    fontSize: '11px',
                    color: '#6b7280'
                  }}>{streakData.longestStreak >= 14 ? '✓ Unlocked' : 'Locked'}</div>
                </div>

                <div style={{
                  textAlign: 'center',
                  padding: '16px',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 202, 0.05) 100%)',
                  borderRadius: '14px',
                  border: `2px solid ${streakData.longestStreak >= 30 ? 'rgba(139, 92, 246, 0.3)' : 'rgba(209, 213, 219, 0.3)'}`,
                  opacity: streakData.longestStreak >= 30 ? 1 : 0.5,
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>⚡</div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#1f2937',
                    marginBottom: '4px'
                  }}>One Month</div>
                  <div style={{
                    fontSize: '11px',
                    color: '#6b7280'
                  }}>{streakData.longestStreak >= 30 ? '✓ Unlocked' : 'Locked'}</div>
                </div>

                <div style={{
                  textAlign: 'center',
                  padding: '16px',
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
                  borderRadius: '14px',
                  border: `2px solid ${streakData.longestStreak >= 90 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(209, 213, 219, 0.3)'}`,
                  opacity: streakData.longestStreak >= 90 ? 1 : 0.5,
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>🔥</div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#1f2937',
                    marginBottom: '4px'
                  }}>Three Months</div>
                  <div style={{
                    fontSize: '11px',
                    color: '#6b7280'
                  }}>{streakData.longestStreak >= 90 ? '✓ Unlocked' : 'Locked'}</div>
                </div>
              </div>
            </div>

            {/* This Month Stats */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                borderRadius: '24px',
                padding: '24px',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 48px rgba(0, 0, 0, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.1)';
              }}
            >
              <h3 style={{
                fontSize: '16px',
                fontWeight: '800',
                color: '#1f2937',
                margin: '0 0 16px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Calendar style={{ height: '18px', width: '18px', color: '#4f46e5' }} />
                This Month
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  padding: '12px',
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
                  borderRadius: '12px',
                  border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}>
                    <span style={{
                      fontSize: '13px',
                      color: '#4b5563',
                      fontWeight: '600'
                    }}>Transactions</span>
                    <span style={{
                      fontWeight: '800',
                      color: '#22c55e',
                      fontSize: '14px'
                    }}>{monthlyStats.transactionsLogged}</span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: '#e5e7eb',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      background: '#22c55e',
                      borderRadius: '3px',
                      width: `${Math.min(monthlyStats.transactionsLogged * 5, 100)}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
                  borderRadius: '12px',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}>
                    <span style={{
                      fontSize: '13px',
                      color: '#4b5563',
                      fontWeight: '600'
                    }}>Budget Checks</span>
                    <span style={{
                      fontWeight: '800',
                      color: '#3b82f6',
                      fontSize: '14px'
                    }}>{monthlyStats.budgetChecks}</span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: '#e5e7eb',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      background: '#3b82f6',
                      borderRadius: '3px',
                      width: `${Math.min(monthlyStats.budgetChecks * 5, 100)}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 202, 0.05) 100%)',
                  borderRadius: '12px',
                  border: '1px solid rgba(139, 92, 246, 0.2)'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px'
                  }}>
                    <span style={{
                      fontSize: '13px',
                      color: '#4b5563',
                      fontWeight: '600'
                    }}>Reports</span>
                    <span style={{
                      fontWeight: '800',
                      color: '#8b5cf6',
                      fontSize: '14px'
                    }}>{monthlyStats.reportsGenerated}</span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: '#e5e7eb',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      background: '#8b5cf6',
                      borderRadius: '3px',
                      width: `${Math.min(monthlyStats.reportsGenerated * 10, 100)}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toast 
        isVisible={showToast}
        message={toastMessage} 
        onClose={() => setShowToast(false)} 
      />
    </div>
  );
};

export default Streak;