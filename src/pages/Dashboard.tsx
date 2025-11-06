import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Eye,
  Calendar,
  Target,
  PieChart,
  Activity,
  Wallet,
  Star,
  Bell,
  FileText
} from 'lucide-react';
import Toast from '../components/Toast';
import { getTodayNotificationCount, generateNotificationMessage } from '../utils/notificationUtils';

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

interface Goal {
  id: number;
  user_id: number;
  target_date: string;
  description: string;
  amount: number;
  created_at: string;
}

interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  incomeChange: number;
  expenseChange: number;
  recentTransactions: Transaction[];
  totalGoals: number;
  totalGoalAmount: number;
  achievedGoalPercentage: number;
}

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [hasShownLoginToast, setHasShownLoginToast] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    incomeChange: 0,
    expenseChange: 0,
    recentTransactions: [],
    totalGoals: 0,
    totalGoalAmount: 0,
    achievedGoalPercentage: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Get user data from localStorage (set during login/signup)
    const userData = localStorage.getItem('userData');
    const token = localStorage.getItem('authToken');

    if (!userData || !token) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchDashboardData(parsedUser.id);
      
      // Show notification toast only if not shown yet in this session
      if (!hasShownLoginToast) {
        // Small delay to ensure dashboard loads smoothly
        setTimeout(() => {
          const todayNotificationCount = getTodayNotificationCount(parsedUser);
          if (todayNotificationCount > 0) {
            const notificationMessage = generateNotificationMessage(todayNotificationCount);
            setToastMessage(notificationMessage);
            setShowToast(true);
            setHasShownLoginToast(true);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate, hasShownLoginToast]);

  const fetchDashboardData = async (userId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      
      console.log('Dashboard: Fetching data for user ID:', userId);
      console.log('Dashboard: Using token:', token ? 'Token exists' : 'No token');
      
      // Fetch transactions
      const transactionsResponse = await fetch(`http://localhost:5000/api/transactions/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Fetch goals
      const goalsResponse = await fetch(`http://localhost:5000/api/goals/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Dashboard: Transactions response status:', transactionsResponse.status);
      console.log('Dashboard: Goals response status:', goalsResponse.status);

      if (transactionsResponse.ok && goalsResponse.ok) {
        const transactions = await transactionsResponse.json();
        const goalsData = await goalsResponse.json();
        
        console.log('Dashboard: Fetched transactions:', transactions);
        console.log('Dashboard: Fetched goals:', goalsData);
        
        // Extract goals array from response
        const goals = goalsData.success ? goalsData.goals : [];
        console.log('Dashboard: Extracted goals array:', goals);
        
        calculateDashboardStats(transactions, goals);
      } else {
        console.error('Dashboard: Failed to fetch data');
        console.error('Dashboard: Transactions response:', transactionsResponse.status, transactionsResponse.statusText);
        console.error('Dashboard: Goals response:', goalsResponse.status, goalsResponse.statusText);
        setLoading(false);
      }
    } catch (error) {
      console.error('Dashboard: Error fetching data:', error);
      setLoading(false);
    }
  };

  const calculateDashboardStats = (transactions: Transaction[], goals: Goal[]) => {
    try {
      console.log('Dashboard: Starting calculation with:', transactions.length, 'transactions and', goals.length, 'goals');
      
      // Calculate current month's income and expenses
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      console.log('Dashboard: Current month:', currentMonth, 'Current year:', currentYear);
      
      const currentMonthTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        const isCurrentMonth = transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear;
        if (isCurrentMonth) {
          console.log('Dashboard: Current month transaction:', t);
        }
        return isCurrentMonth;
      });

      console.log('Dashboard: Current month transactions:', currentMonthTransactions.length);

      const previousMonthTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return transactionDate.getMonth() === prevMonth && 
               transactionDate.getFullYear() === prevYear;
      });

      // Current month calculations
      const monthlyIncome = currentMonthTransactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);

      const monthlyExpenses = currentMonthTransactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);

      console.log('Dashboard: Monthly income:', monthlyIncome);
      console.log('Dashboard: Monthly expenses:', monthlyExpenses);

      // Previous month calculations for comparison
      const prevMonthlyIncome = previousMonthTransactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);

      const prevMonthlyExpenses = previousMonthTransactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);

      // Calculate percentage changes
      const incomeChange = prevMonthlyIncome > 0 
        ? ((monthlyIncome - prevMonthlyIncome) / prevMonthlyIncome) * 100 
        : 0;

      const expenseChange = prevMonthlyExpenses > 0 
        ? ((monthlyExpenses - prevMonthlyExpenses) / prevMonthlyExpenses) * 100 
        : 0;

      // Calculate total balance (all-time income - expenses)
      const totalIncome = transactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpenses = transactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalBalance = totalIncome - totalExpenses;

      console.log('Dashboard: Total income:', totalIncome);
      console.log('Dashboard: Total expenses:', totalExpenses);
      console.log('Dashboard: Total balance:', totalBalance);

      // Get recent transactions (last 5)
      const sortedTransactions = [...transactions]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      console.log('Dashboard: Recent transactions:', sortedTransactions);

      // Calculate goals statistics
      const safeGoals = Array.isArray(goals) ? goals : [];
      console.log('Dashboard: Processing goals:', safeGoals);
      
      const totalGoalAmount = safeGoals.reduce((sum, goal) => sum + goal.amount, 0);
      const achievedGoalPercentage = totalGoalAmount > 0 
        ? Math.min((totalBalance / totalGoalAmount) * 100, 100) 
        : 0;

      console.log('Dashboard: Goals count:', goals.length);
      console.log('Dashboard: Total goal amount:', totalGoalAmount);

      const finalStats = {
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        incomeChange,
        expenseChange,
        recentTransactions: sortedTransactions,
        totalGoals: safeGoals.length,
        totalGoalAmount,
        achievedGoalPercentage
      };

      console.log('Dashboard: Final stats:', finalStats);

      setDashboardStats(finalStats);
      setLoading(false);
    } catch (error) {
      console.error('Error calculating dashboard stats:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (loading) {
    return (
      <div 
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            position: 'relative',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              border: '4px solid rgba(255,255,255,0.3)',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }}></div>
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '64px',
              height: '64px',
              border: '4px solid white',
              borderTop: '4px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
          <p style={{ 
            color: 'white', 
            fontSize: '18px',
            fontWeight: '500',
            margin: '0'
          }}>
            Loading your financial dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative'
      }}
    >
      {/* Main Content */}
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '40px 24px'
      }}>
        {/* Header Section */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '32px'
          }}>
            <div>
              <h1 style={{
                fontSize: '48px',
                fontWeight: '800',
                color: 'white',
                marginBottom: '12px',
                textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                lineHeight: '1.1'
              }}>
                Welcome back, <span style={{
                  background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontWeight: '900',
                  textShadow: 'none',
                  filter: 'drop-shadow(0 2px 4px rgba(255, 107, 107, 0.3))'
                }}>{user?.fullName?.split(' ')[0]}</span>! 👋
              </h1>
              <p style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: '20px',
                fontWeight: '500',
                margin: '0'
              }}>
                Here's what's happening with your finances today
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginBottom: '48px'
        }}>
          {/* Total Balance Card */}
          <div 
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              backgroundImage: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(22, 163, 74, 0.05) 100%)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(34, 197, 94, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.12)';
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <div style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
              }}>
                <DollarSign style={{ 
                  height: '24px', 
                  width: '24px', 
                  color: 'white' 
                }} />
              </div>
              <div style={{
                background: dashboardStats.totalBalance >= 0 
                  ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' 
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
              }}>
                {dashboardStats.totalBalance >= 0 ? '↗ Positive' : '↘ Negative'}
              </div>
            </div>
            <p style={{
              color: '#4b5563',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '6px',
              letterSpacing: '0.025em'
            }}>Total Balance</p>
            <p style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}>{formatCurrency(dashboardStats.totalBalance)}</p>
            <p style={{
              color: '#6b7280',
              fontSize: '12px',
              marginTop: '6px',
              letterSpacing: '0.025em'
            }}>Net worth from all transactions</p>
          </div>

          {/* Monthly Income Card */}
          <div 
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              backgroundImage: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(37, 99, 235, 0.05) 100%)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(59, 130, 246, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.12)';
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}>
              <div style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}>
                <TrendingUp style={{ 
                  height: '24px', 
                  width: '24px', 
                  color: 'white' 
                }} />
              </div>
              <div style={{
                background: dashboardStats.incomeChange >= 0 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
              }}>
                {dashboardStats.incomeChange >= 0 ? '↗' : '↘'}
                {dashboardStats.incomeChange >= 0 ? '+' : ''}{dashboardStats.incomeChange.toFixed(1)}%
              </div>
            </div>
            <p style={{
              color: '#4b5563',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '6px',
              letterSpacing: '0.025em'
            }}>Monthly Income</p>
            <p style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}>{formatCurrency(dashboardStats.monthlyIncome)}</p>
            <p style={{
              color: '#6b7280',
              fontSize: '12px',
              marginTop: '6px',
              letterSpacing: '0.025em'
            }}>This month's earnings</p>
          </div>

          {/* Monthly Expenses Card */}
          <div 
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              backgroundImage: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.05) 100%)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(239, 68, 68, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.12)';
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              marginBottom: '20px' 
            }}>
              <div style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}>
                <TrendingDown style={{ 
                  height: '24px', 
                  width: '24px', 
                  color: 'white' 
                }} />
              </div>
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: dashboardStats.expenseChange <= 0 
                    ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}
              >
                {dashboardStats.expenseChange <= 0 ? (
                  <ArrowDownRight style={{ height: '12px', width: '12px' }} />
                ) : (
                  <ArrowUpRight style={{ height: '12px', width: '12px' }} />
                )}
                <span>
                  {dashboardStats.expenseChange >= 0 ? '+' : ''}{dashboardStats.expenseChange.toFixed(1)}%
                </span>
              </div>
            </div>
            <p style={{ 
              color: '#4b5563', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '6px',
              letterSpacing: '0.025em'
            }}>
              Monthly Expenses
            </p>
            <p style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              color: '#1f2937',
              margin: 0
            }}>
              {formatCurrency(dashboardStats.monthlyExpenses)}
            </p>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '12px', 
              marginTop: '6px',
              letterSpacing: '0.025em'
            }}>
              This month's spending
            </p>
          </div>

          {/* Savings Goal Card */}
          <div 
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              backgroundImage: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(139, 69, 219, 0.05) 100%)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(168, 85, 247, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.12)';
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              marginBottom: '20px' 
            }}>
              <div style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%)',
                boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)'
              }}>
                <Target style={{ 
                  height: '24px', 
                  width: '24px', 
                  color: 'white' 
                }} />
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                background: 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%)',
                color: 'white',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
              }}>
                <span>{Math.round(dashboardStats.achievedGoalPercentage)}%</span>
              </div>
            </div>
            <p style={{ 
              color: '#4b5563', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '6px',
              letterSpacing: '0.025em'
            }}>
              Goals Progress
            </p>
            <p style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              color: '#1f2937',
              margin: 0
            }}>
              {formatCurrency(dashboardStats.totalGoalAmount)}
            </p>
            <div style={{ marginTop: '16px' }}>
              <div style={{
                width: '100%',
                height: '8px',
                borderRadius: '10px',
                background: 'rgba(209, 213, 219, 0.4)',
                overflow: 'hidden'
              }}>
                <div 
                  style={{
                    height: '100%',
                    borderRadius: '10px',
                    background: 'linear-gradient(90deg, #a855f7 0%, #8b5cf6 50%, #7c3aed 100%)',
                    transition: 'all 0.5s ease',
                    width: `${Math.min(dashboardStats.achievedGoalPercentage, 100)}%`,
                    boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)'
                  }}
                ></div>
              </div>
              <p style={{ 
                color: '#6b7280', 
                fontSize: '12px', 
                marginTop: '10px',
                letterSpacing: '0.025em'
              }}>
                {dashboardStats.totalGoals > 0 
                  ? `${dashboardStats.totalGoals} goals • ${formatCurrency(Math.max(0, dashboardStats.totalGoalAmount - dashboardStats.totalBalance))} to go`
                  : 'No goals set yet'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
          marginBottom: '32px'
        }}>
          {/* Recent Transactions */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div 
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                backgroundImage: 'linear-gradient(135deg, rgba(255, 247, 237, 0.4) 0%, rgba(254, 235, 200, 0.4) 100%)'
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                marginBottom: '24px' 
              }}>
                <h3 style={{ 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: '#1f2937',
                  margin: 0
                }}>
                  Recent Transactions
                </h3>
                <Activity style={{ height: '20px', width: '20px', color: '#9ca3af' }} />
              </div>
              
              {dashboardStats.recentTransactions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dashboardStats.recentTransactions.map((transaction) => (
                    <div key={transaction.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      background: 'rgba(255, 255, 255, 0.7)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.5)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          padding: '8px',
                          borderRadius: '8px',
                          background: transaction.type === 'credit' 
                            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                        }}>
                          {transaction.type === 'credit' ? (
                            <TrendingUp style={{ height: '16px', width: '16px', color: 'white' }} />
                          ) : (
                            <TrendingDown style={{ height: '16px', width: '16px', color: 'white' }} />
                          )}
                        </div>
                        <div>
                          <p style={{ 
                            fontWeight: '600', 
                            color: '#1f2937',
                            margin: '0 0 4px 0'
                          }}>
                            {transaction.description}
                          </p>
                          <p style={{ 
                            fontSize: '12px', 
                            color: '#6b7280',
                            margin: 0
                          }}>
                            {formatDate(transaction.created_at)}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ 
                          fontWeight: 'bold', 
                          color: transaction.type === 'credit' ? '#16a34a' : '#dc2626',
                          margin: 0
                        }}>
                          {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#6b7280'
                }}>
                  <Activity style={{ height: '48px', width: '48px', margin: '0 auto 16px', color: '#9ca3af' }} />
                  <p style={{ fontSize: '16px', fontWeight: '500' }}>No transactions yet</p>
                  <p style={{ fontSize: '14px' }}>Your recent transactions will appear here</p>
                </div>
              )}
              
              <button 
                style={{
                  width: '100%', 
                  marginTop: '16px', 
                  padding: '12px 24px', 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                  color: 'white', 
                  borderRadius: '12px', 
                  border: 'none',
                  fontSize: '14px', 
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                }}
                onClick={() => navigate('/transactions')}
              >
                View All Transactions
              </button>
            </div>
          </div>

          {/* Right Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Financial Summary */}
            <div 
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                backgroundImage: 'linear-gradient(135deg, rgba(240, 253, 250, 0.4) 0%, rgba(209, 250, 229, 0.4) 100%)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>Financial Summary</h3>
                <Eye style={{ height: '20px', width: '20px', color: '#9ca3af' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#dbeafe', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', backgroundColor: '#2563eb', borderRadius: '8px' }}>
                      <TrendingUp style={{ height: '16px', width: '16px', color: 'white' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: '600', color: '#1f2937' }}>Monthly Savings</p>
                      <p style={{ fontSize: '12px', color: '#6b7280' }}>Income - Expenses</p>
                    </div>
                  </div>
                  <p style={{ fontWeight: 'bold', color: '#1f2937' }}>
                    {formatCurrency(dashboardStats.monthlyIncome - dashboardStats.monthlyExpenses)}
                  </p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: '#dcfce7', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', backgroundColor: '#16a34a', borderRadius: '8px' }}>
                      <Target style={{ height: '16px', width: '16px', color: 'white' }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: '600', color: '#1f2937' }}>Goals Set</p>
                      <p style={{ fontSize: '12px', color: '#6b7280' }}>Total objectives</p>
                    </div>
                  </div>
                  <p style={{ fontWeight: 'bold', color: '#1f2937' }}>{dashboardStats.totalGoals}</p>
                </div>
              </div>
            </div>

            {/* Quick Navigation */}
            <div 
              style={{
                backdropFilter: 'blur(4px)',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                padding: '24px',
                backgroundColor: 'rgba(238, 242, 255, 0.8)',
                backgroundImage: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>Quick Navigation</h3>
                <Activity style={{ height: '20px', width: '20px', color: '#9ca3af' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#1f2937',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                  onClick={() => navigate('/predict')}
                >
                  <div style={{ padding: '8px', backgroundColor: '#e0e7ff', borderRadius: '8px' }}>
                    <Activity style={{ height: '16px', width: '16px', color: '#6366f1' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: '600', color: '#1f2937', margin: 0 }}>Predict Future</p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>AI-powered predictions</p>
                  </div>
                </button>

                <button 
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#1f2937',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left'
                  }}
                  onClick={() => navigate('/loans')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <div style={{ padding: '8px', backgroundColor: '#fed7aa', borderRadius: '8px' }}>
                    <CreditCard style={{ height: '16px', width: '16px', color: '#ea580c' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: '600', color: '#1f2937', margin: 0 }}>Loan Calculator</p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Plan your loans</p>
                  </div>
                </button>

                <button 
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#1f2937',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                  onClick={() => navigate('/transactions')}
                >
                  <div style={{ padding: '8px', backgroundColor: '#bbf7d0', borderRadius: '8px' }}>
                    <FileText style={{ height: '16px', width: '16px', color: '#16a34a' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: '600', color: '#1f2937', margin: 0 }}>Upload Files</p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>PDF/Excel imports</p>
                  </div>
                </button>
              </div>
            </div>

            {/* AI Insights */}
            <div 
              style={{
                backdropFilter: 'blur(4px)',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                border: '1px solid rgba(147, 51, 234, 0.2)',
                padding: '24px',
                backgroundColor: 'rgba(250, 245, 255, 0.8)',
                backgroundImage: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>AI Insights</h3>
                <Star style={{ height: '20px', width: '20px', color: '#9ca3af' }} />
              </div>
              <div style={{
                padding: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderRadius: '12px',
                marginBottom: '16px'
              }}>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#4b5563',
                  margin: '0 0 8px 0',
                  fontWeight: '500'
                }}>
                  💡 Smart Tip
                </p>
                <p style={{ 
                  fontSize: '13px', 
                  color: '#6b7280',
                  margin: '0 0 12px 0',
                  lineHeight: '1.5'
                }}>
                  {dashboardStats.monthlyIncome > dashboardStats.monthlyExpenses 
                    ? `Great job! You're saving ${formatCurrency(dashboardStats.monthlyIncome - dashboardStats.monthlyExpenses)} this month.`
                    : 'Consider reviewing your expenses to improve your savings rate.'
                  }
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>
                  {((dashboardStats.monthlyIncome - dashboardStats.monthlyExpenses) / Math.max(dashboardStats.monthlyIncome, 1) * 100).toFixed(1)}% 
                  savings rate this month
                </p>
              </div>
              
              <button 
                style={{
                  width: '100%',
                  marginTop: '12px',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%)',
                  color: 'white',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => navigate('/ai-suggestions')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%)';
                }}
              >
                Get AI Suggestions
              </button>
            </div>
          </div>
        </div>
      </main>
      
      {/* Toast Notification */}
      <Toast 
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};

export default Dashboard;