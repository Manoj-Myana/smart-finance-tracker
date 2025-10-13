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
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate]);

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
                  background: 'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
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
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 32px 64px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 30px rgba(34, 197, 94, 0.3)'
              }}>
                <DollarSign style={{ color: 'white', width: '32px', height: '32px' }} />
              </div>
              <div style={{
                background: dashboardStats.totalBalance >= 0 
                  ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' 
                  : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                color: dashboardStats.totalBalance >= 0 ? '#15803d' : '#dc2626',
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {dashboardStats.totalBalance >= 0 ? '↗ Positive' : '↘ Negative'}
              </div>
            </div>
            <p style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '8px',
              margin: '0 0 8px 0'
            }}>Total Balance</p>
            <p style={{
              color: 'white',
              fontSize: '36px',
              fontWeight: '800',
              marginBottom: '8px',
              margin: '0 0 8px 0'
            }}>{formatCurrency(dashboardStats.totalBalance)}</p>
            <p style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '14px',
              margin: '0'
            }}>Net worth from all transactions</p>
          </div>

          {/* Monthly Income Card */}
          <div 
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 32px 64px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
              }}>
                <TrendingUp style={{ color: 'white', width: '32px', height: '32px' }} />
              </div>
              <div style={{
                background: dashboardStats.incomeChange >= 0 
                  ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' 
                  : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                color: dashboardStats.incomeChange >= 0 ? '#1e40af' : '#dc2626',
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {dashboardStats.incomeChange >= 0 ? '↗' : '↘'}
                {dashboardStats.incomeChange >= 0 ? '+' : ''}{dashboardStats.incomeChange.toFixed(1)}%
              </div>
            </div>
            <p style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: '16px',
              fontWeight: '500',
              marginBottom: '8px',
              margin: '0 0 8px 0'
            }}>Monthly Income</p>
            <p style={{
              color: 'white',
              fontSize: '36px',
              fontWeight: '800',
              marginBottom: '8px',
              margin: '0 0 8px 0'
            }}>{formatCurrency(dashboardStats.monthlyIncome)}</p>
            <p style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '14px',
              margin: '0'
            }}>This month's earnings</p>
          </div>

          {/* Monthly Expenses Card */}
          <div 
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              backgroundImage: 'linear-gradient(135deg, rgba(255, 241, 235, 0.4) 0%, rgba(254, 232, 222, 0.4) 100%)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
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
                background: 'linear-gradient(135deg, rgba(251, 113, 133, 0.2) 0%, rgba(239, 68, 68, 0.2) 100%)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(251, 113, 133, 0.3)'
              }}>
                <TrendingDown style={{ 
                  height: '24px', 
                  width: '24px', 
                  color: '#dc2626' 
                }} />
              </div>
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: dashboardStats.expenseChange <= 0 
                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.2) 100%)'
                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)',
                  color: dashboardStats.expenseChange <= 0 ? '#16a34a' : '#dc2626',
                  border: `1px solid ${dashboardStats.expenseChange <= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  backdropFilter: 'blur(8px)'
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
              color: 'rgba(75, 85, 99, 0.8)', 
              fontSize: '14px', 
              fontWeight: '500', 
              marginBottom: '6px',
              letterSpacing: '0.025em'
            }}>
              Monthly Expenses
            </p>
            <p style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              color: '#1f2937',
              margin: 0,
              background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {formatCurrency(dashboardStats.monthlyExpenses)}
            </p>
            <p style={{ 
              fontSize: '12px', 
              color: 'rgba(107, 114, 128, 0.7)', 
              marginTop: '6px',
              letterSpacing: '0.025em'
            }}>
              This month's spending
            </p>
          </div>

          {/* Savings Goal Card */}
          <div 
            style={{
              background: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              backgroundImage: 'linear-gradient(135deg, rgba(250, 245, 255, 0.4) 0%, rgba(243, 232, 255, 0.4) 100%)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
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
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(139, 69, 219, 0.2) 100%)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(168, 85, 247, 0.3)'
              }}>
                <Target style={{ 
                  height: '24px', 
                  width: '24px', 
                  color: '#8b5cf6' 
                }} />
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(139, 69, 219, 0.2) 100%)',
                color: '#8b5cf6',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                backdropFilter: 'blur(8px)'
              }}>
                <span>{Math.round(dashboardStats.achievedGoalPercentage)}%</span>
              </div>
            </div>
            <p style={{ 
              color: 'rgba(75, 85, 99, 0.8)', 
              fontSize: '14px', 
              fontWeight: '500', 
              marginBottom: '6px',
              letterSpacing: '0.025em'
            }}>
              Goals Progress
            </p>
            <p style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              color: '#1f2937',
              margin: 0,
              background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {formatCurrency(dashboardStats.totalGoalAmount)}
            </p>
            <div style={{ marginTop: '16px' }}>
              <div style={{
                width: '100%',
                height: '8px',
                borderRadius: '10px',
                background: 'rgba(209, 213, 219, 0.3)',
                backdropFilter: 'blur(4px)',
                overflow: 'hidden',
                border: '1px solid rgba(209, 213, 219, 0.2)'
              }}>
                <div 
                  style={{
                    height: '100%',
                    borderRadius: '10px',
                    background: 'linear-gradient(90deg, #8b5cf6 0%, #a855f7 50%, #c084fc 100%)',
                    transition: 'all 0.5s ease',
                    width: `${Math.min(dashboardStats.achievedGoalPercentage, 100)}%`,
                    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
                  }}
                ></div>
              </div>
              <p style={{ 
                fontSize: '12px', 
                color: 'rgba(107, 114, 128, 0.7)', 
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Quick Actions */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div 
              style={{
                background: 'rgba(255, 255, 255, 0.25)',
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
                  margin: 0,
                  background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Quick Actions
                </h3>
                <button style={{ 
                  fontSize: '14px', 
                  color: '#3b82f6', 
                  fontWeight: '500',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#1d4ed8';
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#3b82f6';
                  e.currentTarget.style.textDecoration = 'none';
                }}>
                  View All
                </button>
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                gap: '16px' 
              }}>
                <button 
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '20px 16px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
                    transform: 'translateY(0)'
                  }}
                  onClick={() => navigate('/analytics')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.3)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)';
                  }}
                >
                  <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.3s ease'
                  }}>
                    <PieChart style={{ height: '24px', width: '24px' }} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>View Analytics</span>
                </button>
                
                <button 
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '20px 16px',
                    background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 20px rgba(34, 197, 94, 0.3)',
                    transform: 'translateY(0)'
                  }}
                  onClick={() => navigate('/transactions')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(34, 197, 94, 0.4)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #16a34a 0%, #047857 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(34, 197, 94, 0.3)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #22c55e 0%, #059669 100%)';
                  }}
                >
                  <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.3s ease'
                  }}>
                    <TrendingUp style={{ height: '24px', width: '24px' }} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>Add Income</span>
                </button>
                
                <button 
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '20px 16px',
                    background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 20px rgba(234, 88, 12, 0.3)',
                    transform: 'translateY(0)'
                  }}
                  onClick={() => navigate('/transactions')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(234, 88, 12, 0.4)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #c2410c 0%, #b91c1c 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(234, 88, 12, 0.3)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)';
                  }}
                >
                  <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.3s ease'
                  }}>
                    <TrendingDown style={{ height: '24px', width: '24px' }} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>Add Expense</span>
                </button>
                
                <button 
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '20px 16px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
                    transform: 'translateY(0)'
                  }}
                  onClick={() => navigate('/goals')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.4)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(139, 92, 246, 0.3)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)';
                  }}
                >
                  <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.3s ease'
                  }}>
                    <Target style={{ height: '24px', width: '24px' }} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>Set Goals</span>
                </button>
              </div>
            </div>

            {/* Recent Transactions */}
            <div 
              style={{
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                backgroundImage: 'linear-gradient(135deg, rgba(238, 242, 255, 0.4) 0%, rgba(224, 231, 255, 0.4) 100%)'
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
                  margin: 0,
                  background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Recent Transactions
                </h3>
                <button 
                  style={{ 
                    fontSize: '14px', 
                    color: '#3b82f6', 
                    fontWeight: '500',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => navigate('/transactions')}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#1d4ed8';
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#3b82f6';
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  View All
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dashboardStats.recentTransactions.length > 0 ? (
                  dashboardStats.recentTransactions.map((transaction) => (
                    <div 
                      key={transaction.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.4)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '16px',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                          padding: '12px',
                          borderRadius: '12px',
                          background: transaction.type === 'credit' 
                            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.2) 100%)'
                            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)',
                          border: `1px solid ${transaction.type === 'credit' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          backdropFilter: 'blur(8px)'
                        }}>
                          {transaction.type === 'credit' ? (
                            <ArrowUpRight style={{ 
                              height: '20px', 
                              width: '20px', 
                              color: '#16a34a' 
                            }} />
                          ) : (
                            <ArrowDownRight style={{ 
                              height: '20px', 
                              width: '20px', 
                              color: '#dc2626' 
                            }} />
                          )}
                        </div>
                        <div>
                          <p style={{ 
                            fontWeight: '600', 
                            color: '#1f2937', 
                            margin: 0, 
                            marginBottom: '4px',
                            fontSize: '14px'
                          }}>
                            {transaction.description}
                          </p>
                          <p style={{ 
                            fontSize: '12px', 
                            color: 'rgba(107, 114, 128, 0.8)', 
                            margin: 0 
                          }}>
                            {formatDate(transaction.created_at)}
                          </p>
                        </div>
                      </div>
                      <p style={{
                        fontWeight: '700',
                        fontSize: '16px',
                        margin: 0,
                        color: transaction.type === 'credit' ? '#16a34a' : '#dc2626'
                      }}>
                        {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '32px 16px',
                    color: 'rgba(107, 114, 128, 0.8)'
                  }}>
                    <Activity style={{ 
                      height: '48px', 
                      width: '48px', 
                      margin: '0 auto 12px auto', 
                      opacity: 0.5 
                    }} />
                    <p style={{ 
                      fontSize: '18px', 
                      fontWeight: '500', 
                      margin: '0 0 4px 0' 
                    }}>
                      No transactions yet
                    </p>
                    <p style={{ 
                      fontSize: '14px', 
                      margin: '0 0 16px 0' 
                    }}>
                      Add your first transaction to see it here
                    </p>
                    <button 
                      style={{
                        padding: '12px 16px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                      }}
                      onClick={() => navigate('/transactions')}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                      }}
                    >
                      Add Transaction
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats Summary */}
            <div 
              className="backdrop-blur-sm rounded-2xl shadow-lg border border-teal-100/50 p-6"
              style={{
                backgroundColor: 'rgba(240, 253, 250, 0.8)',
                backgroundImage: 'none'
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Financial Summary</h3>
                <Eye className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Monthly Savings</p>
                      <p className="text-xs text-gray-500">Income - Expenses</p>
                    </div>
                  </div>
                  <p className="font-bold text-gray-900">
                    {formatCurrency(dashboardStats.monthlyIncome - dashboardStats.monthlyExpenses)}
                  </p>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-600 rounded-lg">
                      <Target className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Goals Set</p>
                      <p className="text-xs text-gray-500">Total objectives</p>
                    </div>
                  </div>
                  <p className="font-bold text-gray-900">{dashboardStats.totalGoals}</p>
                </div>
              </div>
            </div>

            {/* Navigation Hub */}
            <div 
              className="backdrop-blur-sm rounded-2xl shadow-lg border border-indigo-100/50 p-6"
              style={{
                backgroundColor: 'rgba(238, 242, 255, 0.8)',
                backgroundImage: 'none'
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Quick Navigation</h3>
                <Activity className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-3">
                <button 
                  className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => navigate('/predict')}
                >
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Activity className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Predict Future</p>
                    <p className="text-xs text-gray-500">AI-powered predictions</p>
                  </div>
                </button>
                
                <button 
                  className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => navigate('/loans')}
                >
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <CreditCard className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Loan Calculator</p>
                    <p className="text-xs text-gray-500">Plan your loans</p>
                  </div>
                </button>
                
                <button 
                  className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => navigate('/reports')}
                >
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Upload Files</p>
                    <p className="text-xs text-gray-500">PDF/Excel imports</p>
                  </div>
                </button>
              </div>
            </div>

            {/* AI Insights */}
            <div 
              className="backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100/50 p-6"
              style={{
                backgroundColor: 'rgba(250, 245, 255, 0.8)',
                backgroundImage: 'none'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">AI Insights</h3>
                <Star className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <p className="text-sm font-semibold text-gray-900">Spending Pattern</p>
                  </div>
                  <p className="text-xs text-gray-600">
                    {dashboardStats.monthlyExpenses > dashboardStats.monthlyIncome * 0.7 
                      ? "High spending this month. Consider budget review."
                      : "Good spending control this month!"
                    }
                  </p>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <p className="text-sm font-semibold text-gray-900">Savings Rate</p>
                  </div>
                  <p className="text-xs text-gray-600">
                    {((dashboardStats.monthlyIncome - dashboardStats.monthlyExpenses) / Math.max(dashboardStats.monthlyIncome, 1) * 100).toFixed(1)}% 
                    savings rate this month
                  </p>
                </div>
                
                <button 
                  className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors text-sm font-medium"
                  onClick={() => navigate('/ai-suggestions')}
                >
                  Get AI Suggestions
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;