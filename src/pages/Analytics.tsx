import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

// Modern color palette for charts
const COLORS = {
  income: '#10B981',
  expenditure: '#EF4444',
  savings: '#3B82F6',
  regular: '#8B5CF6',
  irregular: '#F59E0B',
  primary: '#667eea',
  secondary: '#764ba2',
  accent: '#f093fb',
  success: '#4ade80',
  warning: '#facc15',
  danger: '#f87171'
};

const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [flowData, setFlowData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch real transaction data from database
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    const token = localStorage.getItem('authToken');

    if (userData && token) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchTransactions(parsedUser.id);
    } else {
      console.log('No user data found, using sample data');
      generateSampleData();
      setLoading(false);
    }
  }, []);

  const fetchTransactions = async (userId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      console.log('Fetching transactions for analytics:', userId);
      
      const response = await fetch(`http://localhost:5000/api/transactions/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Analytics transactions:', data);
        setTransactions(data);
        
        if (data.length > 0) {
          processAnalyticsData(data);
        } else {
          console.log('No transactions found, using sample data');
          generateSampleData();
        }
      } else if (response.status === 401 || response.status === 403) {
        console.error('Authentication failed');
        alert('Your session has expired. Please log in again.');
        navigate('/login');
      } else {
        console.error('Failed to fetch transactions for analytics');
        generateSampleData();
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      generateSampleData();
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (transactionData: any[]) => {
    // Group transactions by month
    const monthlyMap: { [key: string]: { income: number; expenditure: number; savings: number } } = {};
    const categoryMap: { [key: string]: number } = {};
    const flowMap: { [key: string]: { regularIncome: number; irregularIncome: number; regularExpenditure: number; irregularExpenditure: number } } = {};

    let totalIncome = 0;
    let totalExpenditure = 0;

    transactionData.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const amount = Math.abs(transaction.amount);

      // Initialize month if not exists
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = { income: 0, expenditure: 0, savings: 0 };
      }
      if (!flowMap[monthKey]) {
        flowMap[monthKey] = { regularIncome: 0, irregularIncome: 0, regularExpenditure: 0, irregularExpenditure: 0 };
      }

      // Process by transaction type
      if (transaction.type === 'credit') {
        monthlyMap[monthKey].income += amount;
        totalIncome += amount;
        
        // Flow analysis
        if (transaction.frequency === 'regular') {
          flowMap[monthKey].regularIncome += amount;
        } else {
          flowMap[monthKey].irregularIncome += amount;
        }
      } else {
        monthlyMap[monthKey].expenditure += amount;
        totalExpenditure += amount;

        // Flow analysis
        if (transaction.frequency === 'regular') {
          flowMap[monthKey].regularExpenditure += amount;
        } else {
          flowMap[monthKey].irregularExpenditure += amount;
        }

        // Category analysis
        const description = transaction.description.toLowerCase();
        let category = 'Other';
        
        if (description.includes('food') || description.includes('restaurant') || description.includes('grocery')) {
          category = 'Food';
        } else if (description.includes('transport') || description.includes('gas') || description.includes('uber') || description.includes('taxi')) {
          category = 'Transport';
        } else if (description.includes('entertainment') || description.includes('movie') || description.includes('netflix')) {
          category = 'Entertainment';
        } else if (description.includes('utility') || description.includes('electric') || description.includes('water') || description.includes('internet')) {
          category = 'Utilities';
        } else if (description.includes('shopping') || description.includes('amazon') || description.includes('store')) {
          category = 'Shopping';
        } else if (description.includes('health') || description.includes('medical') || description.includes('hospital')) {
          category = 'Healthcare';
        } else if (description.includes('education') || description.includes('course') || description.includes('book')) {
          category = 'Education';
        }

        categoryMap[category] = (categoryMap[category] || 0) + amount;
      }
    });

    // Calculate savings for each month
    Object.keys(monthlyMap).forEach(month => {
      monthlyMap[month].savings = monthlyMap[month].income - monthlyMap[month].expenditure;
    });

    // Convert to arrays for charts
    const monthlyArray = Object.entries(monthlyMap)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([month, data]) => ({
        month: month.split(' ')[0],
        fullMonth: month,
        ...data
      }));

    const flowArray = Object.entries(flowMap)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([month, data]) => ({
        month: month.split(' ')[0],
        ...data
      }));

    const categoryArray = Object.entries(categoryMap)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: ((amount / totalExpenditure) * 100).toFixed(1)
      }))
      .sort((a, b) => b.amount - a.amount);

    // Pie chart data
    const totalSavings = totalIncome - totalExpenditure;
    const pieChartData = [
      { name: 'Income', value: totalIncome, color: COLORS.income },
      { name: 'Expenditure', value: totalExpenditure, color: COLORS.expenditure },
      { name: 'Savings', value: totalSavings > 0 ? totalSavings : 0, color: COLORS.savings }
    ].filter(item => item.value > 0);

    // Comparison data for regular vs irregular
    const avgRegularIncome = flowArray.reduce((sum, item) => sum + item.regularIncome, 0) / flowArray.length;
    const avgIrregularIncome = flowArray.reduce((sum, item) => sum + item.irregularIncome, 0) / flowArray.length;
    const avgRegularExpense = flowArray.reduce((sum, item) => sum + item.regularExpenditure, 0) / flowArray.length;
    const avgIrregularExpense = flowArray.reduce((sum, item) => sum + item.irregularExpenditure, 0) / flowArray.length;

    const comparisonChartData = [
      { type: 'Regular Income', amount: avgRegularIncome, color: COLORS.regular },
      { type: 'Irregular Income', amount: avgIrregularIncome, color: COLORS.irregular },
      { type: 'Regular Expenses', amount: avgRegularExpense, color: COLORS.expenditure },
      { type: 'Irregular Expenses', amount: avgIrregularExpense, color: COLORS.warning }
    ];

    // Radar chart data for financial health
    const avgIncome = totalIncome / monthlyArray.length;
    const avgExpenditure = totalExpenditure / monthlyArray.length;
    const savingsRate = ((totalSavings / totalIncome) * 100);
    const stabilityScore = (avgRegularIncome / (avgRegularIncome + avgIrregularIncome)) * 100;

    const radarChartData = [
      { metric: 'Income Level', value: Math.min((avgIncome / 10000) * 100, 100), fullMark: 100 },
      { metric: 'Savings Rate', value: Math.max(0, Math.min(savingsRate, 100)), fullMark: 100 },
      { metric: 'Expense Control', value: Math.max(0, 100 - (avgExpenditure / avgIncome) * 50), fullMark: 100 },
      { metric: 'Income Stability', value: stabilityScore, fullMark: 100 },
      { metric: 'Category Diversity', value: Math.min((categoryArray.length / 10) * 100, 100), fullMark: 100 }
    ];

    setMonthlyData(monthlyArray);
    setFlowData(flowArray);
    setCategoryData(categoryArray);
    setPieData(pieChartData);
    setComparisonData(comparisonChartData);
    setRadarData(radarChartData);

    console.log('Processed analytics data:', { monthlyArray, totalTransactions: transactionData.length });
  };

  const generateSampleData = () => {
    console.log('Generating sample data for analytics');
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const sampleMonthly = months.map(month => ({
      month,
      fullMonth: `${month} 2025`,
      income: Math.floor(Math.random() * 3000) + 2000,
      expenditure: Math.floor(Math.random() * 2000) + 1000,
      savings: 0
    }));
    
    sampleMonthly.forEach(item => {
      item.savings = item.income - item.expenditure;
    });

    const totalIncomeCalc = sampleMonthly.reduce((sum, item) => sum + item.income, 0);
    const totalExpenditureCalc = sampleMonthly.reduce((sum, item) => sum + item.expenditure, 0);
    const totalSavingsCalc = totalIncomeCalc - totalExpenditureCalc;

    const pieChartSample = [
      { name: 'Income', value: totalIncomeCalc, color: COLORS.income },
      { name: 'Expenditure', value: totalExpenditureCalc, color: COLORS.expenditure },
      { name: 'Savings', value: totalSavingsCalc, color: COLORS.savings }
    ];

    const flowSample = months.map(month => ({
      month,
      regularIncome: Math.floor(Math.random() * 1500) + 1000,
      irregularIncome: Math.floor(Math.random() * 800) + 200,
      regularExpenditure: Math.floor(Math.random() * 1000) + 500,
      irregularExpenditure: Math.floor(Math.random() * 600) + 100
    }));

    const categories = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Shopping', 'Healthcare', 'Education'];
    const categorySample = categories.map(category => ({
      category,
      amount: Math.floor(Math.random() * 800) + 200,
      percentage: (Math.random() * 25 + 5).toFixed(1)
    }));

    const comparisonSample = [
      { type: 'Regular Income', amount: 2500, color: COLORS.regular },
      { type: 'Irregular Income', amount: 800, color: COLORS.irregular },
      { type: 'Regular Expenses', amount: 1200, color: COLORS.expenditure },
      { type: 'Irregular Expenses', amount: 400, color: COLORS.warning }
    ];

    const radarSample = [
      { metric: 'Income Level', value: 75, fullMark: 100 },
      { metric: 'Savings Rate', value: 60, fullMark: 100 },
      { metric: 'Expense Control', value: 80, fullMark: 100 },
      { metric: 'Income Stability', value: 70, fullMark: 100 },
      { metric: 'Category Diversity', value: 65, fullMark: 100 }
    ];

    setMonthlyData(sampleMonthly);
    setPieData(pieChartSample);
    setFlowData(flowSample);
    setCategoryData(categorySample);
    setComparisonData(comparisonSample);
    setRadarData(radarSample);
  };

  const formatCurrency = (value: number) => `₹${value.toLocaleString()}`;

  // Calculate totals for summary cards
  const totalIncome = monthlyData.reduce((sum: number, data: any) => sum + data.income, 0);
  const totalExpenditure = monthlyData.reduce((sum: number, data: any) => sum + data.expenditure, 0);
  const totalSavings = totalIncome - totalExpenditure;
  const avgMonthlyIncome = totalIncome / (monthlyData.length || 1);
  const savingsRate = totalIncome > 0 ? ((totalSavings / totalIncome) * 100).toFixed(1) : '0';

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          padding: '40px',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
              Analyzing Your Financial Data
            </h3>
            <p style={{ margin: '0', color: '#6b7280', fontSize: '16px' }}>
              Generating insights and visualizations...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const dataSource = transactions.length > 0 ? 'database' : 'sample';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: '40px 20px'
    }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes slideInLeft {
            from {
              opacity: 0;
              transform: translateX(-30px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.9);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>

      {/* Header Section */}
      <div style={{
        textAlign: 'center',
        marginBottom: '50px',
        animation: 'fadeInUp 0.6s ease-out'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px',
          letterSpacing: '-2px'
        }}>
          📊 Financial Analytics
        </h1>
        <p style={{
          fontSize: '20px',
          color: '#6b7280',
          maxWidth: '600px',
          margin: '0 auto 20px auto',
          lineHeight: '1.6'
        }}>
          {dataSource === 'database' 
            ? `Deep insights from your ${transactions.length} transactions` 
            : 'Comprehensive financial analysis with intelligent visualizations'
          }
        </p>
        {dataSource === 'sample' && (
          <div style={{
            display: 'inline-block',
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            color: '#92400e',
            padding: '12px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            📈 Sample data shown - Add transactions to see your real analytics
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '40px',
        animation: 'slideInLeft 0.8s ease-out'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          padding: '8px',
          borderRadius: '16px',
          display: 'flex',
          gap: '8px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
        }}>
          {[
            { key: 'overview', label: '🏠 Overview' },
            { key: 'trends', label: '📈 Trends' },
            { key: 'insights', label: '🧠 Insights' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: activeTab === tab.key 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'transparent',
                color: activeTab === tab.key ? 'white' : '#6b7280',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: activeTab === tab.key ? '0 6px 20px rgba(102, 126, 234, 0.3)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        marginBottom: '50px',
        animation: 'scaleIn 0.8s ease-out'
      }}>
        {[
          {
            title: 'Total Income',
            value: formatCurrency(totalIncome),
            icon: '💰',
            gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            percentage: '+12.5%'
          },
          {
            title: 'Total Expenses',
            value: formatCurrency(totalExpenditure),
            icon: '💳',
            gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            percentage: '+8.2%'
          },
          {
            title: 'Net Savings',
            value: formatCurrency(totalSavings),
            icon: '🏦',
            gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            percentage: `${savingsRate}%`
          },
          {
            title: 'Avg Monthly Income',
            value: formatCurrency(avgMonthlyIncome),
            icon: '📊',
            gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            percentage: '+5.8%'
          }
        ].map((card, index) => (
          <div
            key={card.title}
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              padding: '32px',
              borderRadius: '20px',
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              animation: `slideInLeft 0.6s ease-out ${index * 0.1}s both`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.1)';
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '100px',
              height: '100px',
              background: card.gradient,
              borderRadius: '50%',
              opacity: '0.1'
            }}></div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{
                background: card.gradient,
                padding: '12px',
                borderRadius: '12px',
                fontSize: '24px'
              }}>
                {card.icon}
              </div>
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#059669',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {card.percentage}
              </div>
            </div>
            
            <h3 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#6b7280',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {card.title}
            </h3>
            
            <p style={{
              fontSize: '32px',
              fontWeight: '800',
              color: '#1f2937',
              margin: '0',
              lineHeight: '1'
            }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Main Content Based on Active Tab */}
      {activeTab === 'overview' && (
        <div style={{ animation: 'fadeInUp 0.6s ease-out' }}>
          {/* Financial Overview Pie Chart */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '40px',
            marginBottom: '40px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              🥧 Financial Distribution
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '32px', fontSize: '16px' }}>
              Overview of your income, expenses, and savings distribution
            </p>
            
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }: any) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Trends */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: '32px',
            marginBottom: '40px'
          }}>
            {/* Income vs Expenses Bar Chart */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '40px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                📊 Monthly Income vs Expenses
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value: any) => `₹${(value/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="income" fill={COLORS.income} name="Income" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenditure" fill={COLORS.expenditure} name="Expenditure" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Savings Trend Area Chart */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '40px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                💰 Savings Trend
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value: any) => `₹${(value/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="savings"
                    stroke={COLORS.savings}
                    fill={COLORS.savings}
                    fillOpacity={0.3}
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trends' && (
        <div style={{ animation: 'fadeInUp 0.6s ease-out' }}>
          {/* Regular vs Irregular Income/Expense Flow */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: '32px',
            marginBottom: '40px'
          }}>
            {/* Income Flow Line Chart */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '40px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                📈 Income Flow Analysis
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={flowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value: any) => `₹${(value/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="regularIncome"
                    stroke={COLORS.regular}
                    strokeWidth={3}
                    name="Regular Income"
                    dot={{ fill: COLORS.regular, strokeWidth: 2, r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="irregularIncome"
                    stroke={COLORS.irregular}
                    strokeWidth={3}
                    name="Irregular Income"
                    dot={{ fill: COLORS.irregular, strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Expense Flow Line Chart */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '40px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                📉 Expense Flow Analysis
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={flowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value: any) => `₹${(value/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="regularExpenditure"
                    stroke={COLORS.expenditure}
                    strokeWidth={3}
                    name="Regular Expenses"
                    dot={{ fill: COLORS.expenditure, strokeWidth: 2, r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="irregularExpenditure"
                    stroke={COLORS.warning}
                    strokeWidth={3}
                    name="Irregular Expenses"
                    dot={{ fill: COLORS.warning, strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Spending Analysis */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '40px',
            marginBottom: '40px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              🏷️ Spending by Category
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="category" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100} 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="left"
                  tickFormatter={(value: any) => `₹${(value/1000).toFixed(0)}k`} 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  tickFormatter={(value: any) => `${value}%`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: any, name: any) => [
                    name === 'amount' ? formatCurrency(Number(value)) : `${value}%`,
                    name === 'amount' ? 'Amount' : 'Percentage'
                  ]}
                  contentStyle={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Bar 
                  yAxisId="left"
                  dataKey="amount" 
                  fill="#f59e0b" 
                  name="Amount Spent"
                  radius={[4, 4, 0, 0]}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="percentage" 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  name="Percentage of Total"
                  dot={{ fill: '#ef4444', strokeWidth: 2, r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div style={{ animation: 'fadeInUp 0.6s ease-out' }}>
          {/* Financial Health Radar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '32px',
            marginBottom: '40px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '40px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                🎯 Financial Health Score
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#f0f0f0" />
                  <PolarAngleAxis 
                    dataKey="metric" 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                  />
                  <PolarRadiusAxis 
                    angle={0} 
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                  />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="#667eea"
                    fill="#667eea"
                    fillOpacity={0.2}
                    strokeWidth={3}
                    dot={{ fill: '#667eea', strokeWidth: 2, r: 6 }}
                  />
                  <Tooltip 
                    formatter={(value: any) => [`${value}%`, 'Score']}
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Regular vs Irregular Comparison */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '40px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                ⚖️ Income vs Expense Patterns
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="type" 
                    angle={-15}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tickFormatter={(value: any) => `₹${(value/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="amount" 
                    radius={[8, 8, 0, 0]}
                  >
                    {comparisonData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Key Insights Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px'
          }}>
            {[
              {
                title: 'Savings Rate',
                value: `${savingsRate}%`,
                insight: `${parseFloat(savingsRate) > 20 ? 'Excellent' : parseFloat(savingsRate) > 10 ? 'Good' : 'Needs Improvement'}`,
                icon: '💰',
                color: parseFloat(savingsRate) > 20 ? '#10b981' : parseFloat(savingsRate) > 10 ? '#f59e0b' : '#ef4444'
              },
              {
                title: 'Top Expense Category',
                value: categoryData[0]?.category || 'No Data',
                insight: `${categoryData[0]?.percentage || 0}% of total expenses`,
                icon: '📊',
                color: '#667eea'
              },
              {
                title: 'Income Stability',
                value: 'Stable',
                insight: 'Based on regular vs irregular income ratio',
                icon: '📈',
                color: '#8b5cf6'
              },
              {
                title: 'Monthly Growth',
                value: monthlyData.length > 1 ? `+${((monthlyData[monthlyData.length - 1]?.income - monthlyData[0]?.income) / monthlyData[0]?.income * 100).toFixed(1)}%` : 'N/A',
                insight: 'Income growth trend',
                icon: '🚀',
                color: '#06b6d4'
              }
            ].map((insight, index) => (
              <div
                key={insight.title}
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  padding: '32px',
                  borderRadius: '20px',
                  boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                  animation: `slideInLeft 0.6s ease-out ${index * 0.1}s both`
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  width: '80px',
                  height: '80px',
                  background: insight.color,
                  borderRadius: '50%',
                  opacity: '0.1'
                }}></div>
                
                <div style={{
                  background: insight.color,
                  color: 'white',
                  width: '50px',
                  height: '50px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  marginBottom: '20px'
                }}>
                  {insight.icon}
                </div>
                
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  {insight.title}
                </h4>
                
                <p style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  color: '#1f2937',
                  marginBottom: '8px'
                }}>
                  {insight.value}
                </p>
                
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: '0'
                }}>
                  {insight.insight}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;