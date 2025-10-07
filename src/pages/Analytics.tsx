import React, { useState, useEffect } from 'react';
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
  Area
} from 'recharts';

// Colors for charts
const COLORS = {
  income: '#10B981',
  expenditure: '#EF4444',
  savings: '#3B82F6',
  regular: '#8B5CF6',
  irregular: '#F59E0B'
};

const Analytics: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [flowData, setFlowData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Category analysis (extract category from description)
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
        month: month.split(' ')[0], // Just month name
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
        amount
      }))
      .sort((a, b) => b.amount - a.amount);

    // Pie chart data
    const totalSavings = totalIncome - totalExpenditure;
    const pie = [
      { name: 'Income', value: totalIncome, color: COLORS.income },
      { name: 'Expenditure', value: totalExpenditure, color: COLORS.expenditure },
      { name: 'Savings', value: totalSavings > 0 ? totalSavings : 0, color: COLORS.savings }
    ].filter(item => item.value > 0);

    setMonthlyData(monthlyArray);
    setFlowData(flowArray);
    setCategoryData(categoryArray);
    setPieData(pie);

    console.log('Processed analytics data:', {
      monthlyArray,
      flowArray,
      categoryArray,
      pie,
      totalTransactions: transactionData.length
    });
  };

  const generateSampleData = () => {
    // Fallback sample data when no real transactions exist
    console.log('Generating sample data for analytics');
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const sampleMonthly = months.map(month => ({
      month,
      income: Math.floor(Math.random() * 3000) + 2000,
      expenditure: Math.floor(Math.random() * 2000) + 1000,
      savings: 0
    }));
    
    sampleMonthly.forEach(item => {
      item.savings = item.income - item.expenditure;
    });

    const totalIncome = sampleMonthly.reduce((sum, item) => sum + item.income, 0);
    const totalExpenditure = sampleMonthly.reduce((sum, item) => sum + item.expenditure, 0);
    const totalSavings = totalIncome - totalExpenditure;

    const pie = [
      { name: 'Income', value: totalIncome, color: COLORS.income },
      { name: 'Expenditure', value: totalExpenditure, color: COLORS.expenditure },
      { name: 'Savings', value: totalSavings, color: COLORS.savings }
    ];

    const flow = months.map(month => ({
      month,
      regularIncome: Math.floor(Math.random() * 1500) + 1000,
      irregularIncome: Math.floor(Math.random() * 800) + 200,
      regularExpenditure: Math.floor(Math.random() * 1000) + 500,
      irregularExpenditure: Math.floor(Math.random() * 600) + 100
    }));

    const categories = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Shopping'];
    const categorySpending = categories.map(category => ({
      category,
      amount: Math.floor(Math.random() * 800) + 200
    }));

    setMonthlyData(sampleMonthly);
    setPieData(pie);
    setFlowData(flow);
    setCategoryData(categorySpending);
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  // Calculate totals for summary cards
  const totalIncome = monthlyData.reduce((sum, data) => sum + data.income, 0);
  const totalExpenditure = monthlyData.reduce((sum, data) => sum + data.expenditure, 0);
  const totalSavings = totalIncome - totalExpenditure;
  const avgMonthlyIncome = totalIncome / (monthlyData.length || 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  const dataSource = transactions.length > 0 ? 'database' : 'sample';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Financial Analytics Dashboard</h1>
        <p className="text-gray-600">
          {dataSource === 'database' 
            ? `Insights from your ${transactions.length} transactions` 
            : 'Sample data shown - Add transactions to see your real analytics'
          }
        </p>
        {dataSource === 'sample' && (
          <div className="mt-2 p-2 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 text-sm rounded">
            💡 No transaction data found. Please add some transactions to see real analytics.
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Income</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Expenses</h3>
          <p className="mt-2 text-3xl font-bold text-red-600">{formatCurrency(totalExpenditure)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Savings</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">{formatCurrency(totalSavings)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Avg Monthly Income</h3>
          <p className="mt-2 text-3xl font-bold text-purple-600">{formatCurrency(avgMonthlyIncome)}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pie Chart - Income/Expense Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Financial Overview
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
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

        {/* Bar Chart - Monthly Trends */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Monthly Income vs Expenses
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value: any) => `$${value.toLocaleString()}`} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="income" fill={COLORS.income} name="Income" />
              <Bar dataKey="expenditure" fill={COLORS.expenditure} name="Expenditure" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart - Regular vs Irregular Income */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Income Flow Analysis
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={flowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value: any) => `$${value.toLocaleString()}`} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              <Legend />
              <Line
                type="monotone"
                dataKey="regularIncome"
                stroke={COLORS.regular}
                strokeWidth={2}
                name="Regular Income"
              />
              <Line
                type="monotone"
                dataKey="irregularIncome"
                stroke={COLORS.irregular}
                strokeWidth={2}
                name="Irregular Income"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Area Chart - Savings Trend */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Savings Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value: any) => `$${value.toLocaleString()}`} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              <Area
                type="monotone"
                dataKey="savings"
                stroke={COLORS.savings}
                fill={COLORS.savings}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Spending Chart */}
      {categoryData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Spending by Category
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="category"
                angle={-45}
                textAnchor="end"
                height={60}
                fontSize={12}
              />
              <YAxis tickFormatter={(value: any) => `$${value.toLocaleString()}`} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              <Bar dataKey="amount" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default Analytics;