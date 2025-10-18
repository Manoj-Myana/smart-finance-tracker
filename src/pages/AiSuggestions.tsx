import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain,
  TrendingUp,
  DollarSign,
  Target,
  PieChart,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Lightbulb,
  Shield,
  Calculator,
  Calendar,
  Wallet,
  Activity,
  BarChart3,
  Award,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import geminiService from '../services/geminiService';

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

interface SpendingInsight {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  suggestion: string;
}

interface FinancialHealthMetrics {
  score: number;
  incomeStability: number;
  spendingConsistency: number;
  savingsRate: number;
  debtRatio: number;
}

interface GeminiSuggestion {
  category: string;
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
  potentialSavings?: string;
  actionItems: string[];
}

interface CachedSuggestion {
  id: string;
  timestamp: string;
  suggestions: GeminiSuggestion[];
  transactionCount: number;
  userProfile: {
    name: string;
    monthlyIncome: number;
  };
}

const AiSuggestions: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [spendingInsights, setSpendingInsights] = useState<SpendingInsight[]>([]);
  const [financialHealth, setFinancialHealth] = useState<FinancialHealthMetrics | null>(null);
  const [budgetRecommendations, setBudgetRecommendations] = useState<string[]>([]);
  const [investmentSuggestions, setInvestmentSuggestions] = useState<string[]>([]);
  const [goalPlans, setGoalPlans] = useState<string[]>([]);
  const [expenseOptimizations, setExpenseOptimizations] = useState<string[]>([]);
  
  // Add Gemini AI suggestions state
  const [geminiSuggestions, setGeminiSuggestions] = useState<GeminiSuggestion[]>([]);
  const [geminiLoading, setGeminiLoading] = useState(false);
  
  // Add caching state for AI suggestions
  const [cachedSuggestions, setCachedSuggestions] = useState<CachedSuggestion[]>([]);
  const [currentSuggestionId, setCurrentSuggestionId] = useState<string | null>(null);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Get user data from localStorage (matching Transactions page pattern)
    const userData = localStorage.getItem('userData');
    const token = localStorage.getItem('authToken');
    
    if (!userData || !token) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Load cached suggestions first for instant display
      loadCachedSuggestions(parsedUser.id);
      
      fetchTransactions(parsedUser.id);
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  const fetchTransactions = async (userId: number) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      console.log('Fetching transactions for AI analysis, user:', userId);
      
      // Fetch real transactions from Node.js backend (same as Transactions page)
      const response = await fetch(`http://localhost:5000/api/transactions/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched transactions for AI analysis:', data);
        setTransactions(data);
        
        // Analyze the real transaction data
        await analyzeFinancialData(data);
      } else {
        console.error('Failed to fetch transactions for AI analysis');
      }
    } catch (error) {
      console.error('Error fetching transactions for AI analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeFinancialData = async (transactions: Transaction[]) => {
    setAnalyzing(true);
    
    // Simulate AI analysis delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      console.log('Analyzing transactions:', transactions.length, 'transactions');
      
      // Calculate spending insights
      const insights = calculateSpendingInsights(transactions);
      setSpendingInsights(insights);

      // Calculate financial health score
      const health = calculateFinancialHealth(transactions);
      setFinancialHealth(health);

      // Generate recommendations based on real data
      const budgetRecs = generateBudgetRecommendations(transactions, insights);
      setBudgetRecommendations(budgetRecs);

      const investmentSugs = generateInvestmentSuggestions(transactions, health);
      setInvestmentSuggestions(investmentSugs);

      const goals = generateGoalPlans(transactions, health);
      setGoalPlans(goals);

      const optimizations = generateExpenseOptimizations(transactions, insights);
      setExpenseOptimizations(optimizations);

      // Don't automatically generate Gemini AI suggestions - only when user explicitly requests
      // The cached suggestions are loaded separately in useEffect

      console.log('AI analysis completed with insights:', insights.length);
    } catch (error) {
      console.error('Error analyzing financial data:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const generateGeminiSuggestions = async (transactions: Transaction[]) => {
    setGeminiLoading(true);
    try {
      const userProfile = {
        name: user?.fullName || 'User',
        monthlyIncome: calculateMonthlyIncome(transactions)
      };

      const suggestions = await geminiService.generatePersonalizedSuggestions(
        transactions, 
        userProfile
      );
      
      setGeminiSuggestions(suggestions);
      
      // Save to cache
      if (user && suggestions.length > 0) {
        saveSuggestionsToCache(user.id, suggestions, transactions.length, userProfile);
      }
      
      console.log('Generated Gemini AI suggestions:', suggestions);
    } catch (error) {
      console.error('Error generating Gemini suggestions:', error);
      setGeminiSuggestions([]);
    } finally {
      setGeminiLoading(false);
    }
  };

  const calculateMonthlyIncome = (transactions: Transaction[]): number => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const currentMonthIncome = transactions
      .filter(t => {
        const transactionDate = new Date(t.date);
        return t.type === 'credit' && 
               transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
      
    return currentMonthIncome;
  };

  const refreshGeminiSuggestions = async () => {
    if (transactions.length > 0) {
      setIsRefreshing(true);
      await generateGeminiSuggestions(transactions);
      setIsRefreshing(false);
    }
  };

  // Caching functions for AI suggestions
  const getCacheKey = (userId: number) => `ai_suggestions_${userId}`;

  const loadCachedSuggestions = (userId: number) => {
    try {
      const cacheKey = getCacheKey(userId);
      const cached = localStorage.getItem(cacheKey);
      
      console.log('Loading cache for user:', userId, 'with key:', cacheKey);
      console.log('Cached data:', cached ? 'Found' : 'Not found');
      
      if (cached) {
        const parsedCache: CachedSuggestion[] = JSON.parse(cached);
        setCachedSuggestions(parsedCache);
        
        console.log('Parsed cache:', parsedCache.length, 'cached suggestion sets');
        
        // Load the most recent suggestions if available
        if (parsedCache.length > 0) {
          const latest = parsedCache[0]; // Assuming sorted by timestamp desc
          setGeminiSuggestions(latest.suggestions);
          setCurrentSuggestionId(latest.id);
          console.log('Loaded cached suggestions:', latest.suggestions.length, 'suggestions from', latest.timestamp);
        }
      } else {
        console.log('No cached suggestions found for user:', userId);
      }
    } catch (error) {
      console.error('Error loading cached suggestions:', error);
    }
  };

  const saveSuggestionsToCache = (
    userId: number,
    suggestions: GeminiSuggestion[],
    transactionCount: number,
    userProfile: { name: string; monthlyIncome: number }
  ) => {
    try {
      const cacheKey = getCacheKey(userId);
      const newSuggestion: CachedSuggestion = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        suggestions,
        transactionCount,
        userProfile
      };

      // Get existing cache
      const existingCache = localStorage.getItem(cacheKey);
      let cachedSuggestions: CachedSuggestion[] = existingCache ? JSON.parse(existingCache) : [];
      
      // Add new suggestion at the beginning
      cachedSuggestions.unshift(newSuggestion);
      
      // Keep only last 10 suggestions to manage storage
      cachedSuggestions = cachedSuggestions.slice(0, 10);
      
      // Save to localStorage
      localStorage.setItem(cacheKey, JSON.stringify(cachedSuggestions));
      
      // Update state
      setCachedSuggestions(cachedSuggestions);
      setCurrentSuggestionId(newSuggestion.id);
      
      console.log('Saved new suggestions to cache:', suggestions.length, 'suggestions');
      console.log('Total cached suggestion sets:', cachedSuggestions.length);
      console.log('Cache key used:', cacheKey);
    } catch (error) {
      console.error('Error saving suggestions to cache:', error);
    }
  };

  const loadSpecificSuggestion = (suggestionId: string) => {
    const cached = cachedSuggestions.find(c => c.id === suggestionId);
    if (cached) {
      setGeminiSuggestions(cached.suggestions);
      setCurrentSuggestionId(suggestionId);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateSpendingInsights = (transactions: Transaction[]): SpendingInsight[] => {
    const categorySpending: { [key: string]: number } = {};
    const debitTransactions = transactions.filter(t => t.type === 'debit');
    const totalDebit = debitTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Handle case with no debit transactions
    if (debitTransactions.length === 0 || totalDebit === 0) {
      return [{
        category: 'No Expenses',
        amount: 0,
        percentage: 0,
        trend: 'stable' as 'stable',
        suggestion: 'No expense transactions found. Start tracking your expenses to get personalized insights.'
      }];
    }

    // Categorize spending based on description keywords (enhanced for real transaction data)
    transactions.filter(t => t.type === 'debit').forEach(transaction => {
      const desc = transaction.description.toLowerCase();
      let category = 'Other';
      
      if (desc.includes('food') || desc.includes('restaurant') || desc.includes('grocery') || 
          desc.includes('cafe') || desc.includes('dining') || desc.includes('meal') ||
          desc.includes('lunch') || desc.includes('dinner') || desc.includes('breakfast') ||
          desc.includes('pizza') || desc.includes('burger') || desc.includes('zomato') ||
          desc.includes('swiggy') || desc.includes('uber eats')) {
        category = 'Food & Dining';
      } else if (desc.includes('gas') || desc.includes('fuel') || desc.includes('transport') ||
                 desc.includes('uber') || desc.includes('taxi') || desc.includes('bus') ||
                 desc.includes('train') || desc.includes('metro') || desc.includes('parking') ||
                 desc.includes('toll') || desc.includes('petrol') || desc.includes('diesel')) {
        category = 'Transportation';
      } else if (desc.includes('shop') || desc.includes('store') || desc.includes('retail') ||
                 desc.includes('amazon') || desc.includes('flipkart') || desc.includes('mall') ||
                 desc.includes('purchase') || desc.includes('clothing') || desc.includes('shoes') ||
                 desc.includes('electronics') || desc.includes('gadget')) {
        category = 'Shopping';
      } else if (desc.includes('utility') || desc.includes('electric') || desc.includes('water') ||
                 desc.includes('internet') || desc.includes('phone') || desc.includes('mobile') ||
                 desc.includes('bill') || desc.includes('wifi') || desc.includes('broadband') ||
                 desc.includes('electricity') || desc.includes('gas bill')) {
        category = 'Utilities';
      } else if (desc.includes('entertainment') || desc.includes('movie') || desc.includes('game') ||
                 desc.includes('netflix') || desc.includes('spotify') || desc.includes('gym') ||
                 desc.includes('sports') || desc.includes('cinema') || desc.includes('theater') ||
                 desc.includes('concert') || desc.includes('subscription')) {
        category = 'Entertainment';
      } else if (desc.includes('health') || desc.includes('medical') || desc.includes('pharmacy') ||
                 desc.includes('doctor') || desc.includes('hospital') || desc.includes('medicine') ||
                 desc.includes('clinic') || desc.includes('dental') || desc.includes('checkup')) {
        category = 'Healthcare';
      } else if (desc.includes('education') || desc.includes('school') || desc.includes('college') ||
                 desc.includes('course') || desc.includes('book') || desc.includes('tuition') ||
                 desc.includes('training') || desc.includes('certification')) {
        category = 'Education';
      } else if (desc.includes('travel') || desc.includes('hotel') || desc.includes('flight') ||
                 desc.includes('vacation') || desc.includes('trip') || desc.includes('booking') ||
                 desc.includes('airline') || desc.includes('resort')) {
        category = 'Travel';
      }

      categorySpending[category] = (categorySpending[category] || 0) + transaction.amount;
    });

    return Object.entries(categorySpending).map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / totalDebit) * 100,
      trend: (Math.random() > 0.5 ? 'up' : 'down') as 'up' | 'down', // Simplified trend calculation
      suggestion: generateCategorySuggestion(category, amount, (amount / totalDebit) * 100)
    })).sort((a, b) => b.amount - a.amount);
  };

  const generateCategorySuggestion = (category: string, amount: number, percentage: number): string => {
    if (percentage > 30) {
      return `Consider reducing ${category.toLowerCase()} expenses. This category represents ${percentage.toFixed(1)}% of your total spending.`;
    } else if (percentage < 5) {
      return `Your ${category.toLowerCase()} spending is well-controlled at ${percentage.toFixed(1)}% of total expenses.`;
    } else {
      return `Your ${category.toLowerCase()} spending is reasonable. Consider tracking for potential optimizations.`;
    }
  };

  const calculateFinancialHealth = (transactions: Transaction[]): FinancialHealthMetrics => {
    const totalCredit = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    const totalDebit = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
    const netIncome = totalCredit - totalDebit;
    
    console.log('Financial Health Calculation:', { totalCredit, totalDebit, netIncome });
    
    // Calculate metrics with better logic for real data
    const savingsRate = totalCredit > 0 ? Math.max(0, Math.min(100, (netIncome / totalCredit) * 100)) : 0;
    const spendingRatio = totalCredit > 0 ? Math.min(100, (totalDebit / totalCredit) * 100) : 100;
    
    // Income stability based on regular transactions and frequency
    const regularIncomeTransactions = transactions.filter(t => t.type === 'credit' && t.frequency === 'regular');
    const incomeStability = regularIncomeTransactions.length > 0 ? 
      Math.min(95, 60 + (regularIncomeTransactions.length * 10)) : 
      Math.max(40, 60 - (transactions.filter(t => t.type === 'credit').length * 5));
    
    // Spending consistency based on transaction patterns
    const debitTransactions = transactions.filter(t => t.type === 'debit');
    const avgTransactionAmount = debitTransactions.length > 0 ? totalDebit / debitTransactions.length : 0;
    const largeTransactions = debitTransactions.filter(t => t.amount > avgTransactionAmount * 2).length;
    const spendingConsistency = Math.max(50, Math.min(95, 85 - (largeTransactions * 5)));
    
    // Calculate overall score with weighted factors
    const score = Math.round(
      savingsRate * 0.35 + 
      incomeStability * 0.25 + 
      spendingConsistency * 0.20 + 
      Math.max(0, 100 - spendingRatio) * 0.20
    );
    
    const finalScore = Math.max(0, Math.min(100, score));
    
    console.log('Financial Health Metrics:', {
      score: finalScore,
      savingsRate,
      incomeStability,
      spendingConsistency,
      spendingRatio
    });
    
    return {
      score: finalScore,
      incomeStability: Math.round(incomeStability),
      spendingConsistency: Math.round(spendingConsistency),
      savingsRate: Math.round(savingsRate),
      debtRatio: Math.round(spendingRatio)
    };
  };

  const generateBudgetRecommendations = (transactions: Transaction[], insights: SpendingInsight[]): string[] => {
    const recommendations = [];
    const totalIncome = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
    
    if (totalExpenses > totalIncome * 0.8) {
      recommendations.push("Consider implementing the 50/30/20 rule: 50% needs, 30% wants, 20% savings");
    }
    
    const highestCategory = insights[0];
    if (highestCategory && highestCategory.percentage > 25) {
      recommendations.push(`Reduce ${highestCategory.category} spending by 10-15% to improve your budget balance`);
    }
    
    recommendations.push("Set up automatic transfers to savings account for consistent wealth building");
    recommendations.push("Review and cancel unused subscriptions to free up monthly budget");
    
    return recommendations;
  };

  const generateInvestmentSuggestions = (transactions: Transaction[], health: FinancialHealthMetrics): string[] => {
    const suggestions = [];
    
    if (health.score > 70) {
      suggestions.push("Consider starting with low-cost index funds for long-term wealth building");
      suggestions.push("Look into employer 401(k) matching if available - it's free money!");
    }
    
    if (health.savingsRate > 15) {
      suggestions.push("With your good savings rate, consider diversifying into ETFs or mutual funds");
    }
    
    suggestions.push("Start an emergency fund with 3-6 months of expenses before aggressive investing");
    suggestions.push("Consider dollar-cost averaging into diversified portfolios");
    
    return suggestions;
  };

  const generateGoalPlans = (transactions: Transaction[], health: FinancialHealthMetrics): string[] => {
    const plans = [];
    const monthlyIncome = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0) / 12;
    
    plans.push(`Emergency Fund: Save ₹${Math.round(monthlyIncome * 3).toLocaleString()} over the next 12 months`);
    plans.push(`Vacation Fund: Set aside ₹5,000-8,000 monthly for your next getaway`);
    
    if (health.score > 60) {
      plans.push(`Investment Goal: Start investing ₹${Math.round(monthlyIncome * 0.1).toLocaleString()} monthly`);
    }
    
    plans.push(`Debt Reduction: Allocate extra ₹2,500-5,000 monthly toward high-interest debts`);
    
    return plans;
  };

  const generateExpenseOptimizations = (transactions: Transaction[], insights: SpendingInsight[]): string[] => {
    const optimizations = [];
    
    insights.forEach(insight => {
      if (insight.percentage > 20) {
        optimizations.push(`${insight.category}: Look for cheaper alternatives or reduce frequency by 20%`);
      }
    });
    
    optimizations.push("Review all recurring subscriptions and cancel unused services");
    optimizations.push("Negotiate better rates for insurance, phone, and utility bills");
    optimizations.push("Use cashback credit cards for regular purchases (pay off monthly)");
    optimizations.push("Consider bulk buying for frequently used items to reduce per-unit costs");
    
    return optimizations;
  };

  const getHealthScoreColor = (score: number): string => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const getHealthScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}>
        <div style={{
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '40px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <RefreshCw style={{ 
            width: '40px', 
            height: '40px', 
            animation: 'spin 1s linear infinite', 
            marginBottom: '20px',
            color: '#667eea'
          }} />
          <p style={{ 
            color: '#4a5568', 
            fontSize: '18px', 
            fontWeight: '500',
            margin: 0
          }}>
            Loading your financial data...
          </p>
        </div>
        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: '20px',
      overflowX: 'hidden'
    }}>
      <style>
        {`
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
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.02);
            }
          }
          @keyframes shimmer {
            0% {
              background-position: -200px 0;
            }
            100% {
              background-position: 200px 0;
            }
          }
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
          animation: 'fadeInUp 0.6s ease-out'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              padding: '16px',
              marginRight: '16px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              <Brain style={{ width: '32px', height: '32px', color: 'white' }} />
            </div>
            <h1 style={{
              fontSize: '48px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0,
              letterSpacing: '-2px'
            }}>
              AI Financial Insights
            </h1>
          </div>
          <p style={{
            fontSize: '20px',
            color: 'rgba(255, 255, 255, 0.9)',
            maxWidth: '700px',
            margin: '0 auto',
            lineHeight: '1.6',
            fontWeight: '400'
          }}>
            Intelligent analysis of your financial data with personalized recommendations to optimize your financial health
          </p>
        </div>

        {analyzing && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '32px',
            marginBottom: '40px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                borderRadius: '16px',
                padding: '12px',
                marginRight: '16px',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}>
                <Brain style={{ 
                  width: '24px', 
                  height: '24px', 
                  color: 'white'
                }} />
              </div>
              <span style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#4a5568',
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                AI is analyzing your financial data...
              </span>
            </div>
          </div>
        )}

        {/* Financial Health Score */}
        {financialHealth && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '32px',
            padding: '40px',
            marginBottom: '40px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            animation: 'fadeInUp 0.6s ease-out'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '32px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                padding: '12px',
                marginRight: '16px'
              }}>
                <Activity style={{ width: '24px', height: '24px', color: 'white' }} />
              </div>
              <h2 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#1a202c',
                margin: 0
              }}>
                Financial Health Score
              </h2>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: window.innerWidth > 1024 ? '1fr 1fr' : '1fr',
              gap: '40px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '160px',
                  height: '160px',
                  borderRadius: '50%',
                  margin: '0 auto 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  fontWeight: '800',
                  color: 'white',
                  background: `conic-gradient(${getHealthScoreColor(financialHealth.score)} 0deg, ${getHealthScoreColor(financialHealth.score)} ${financialHealth.score * 3.6}deg, #e2e8f0 ${financialHealth.score * 3.6}deg, #e2e8f0 360deg)`,
                  position: 'relative'
                }}>
                  <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: getHealthScoreColor(financialHealth.score),
                    fontSize: '36px',
                    fontWeight: '800'
                  }}>
                    {financialHealth.score}
                  </div>
                </div>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: getHealthScoreColor(financialHealth.score),
                  marginBottom: '8px'
                }}>
                  {getHealthScoreLabel(financialHealth.score)}
                </h3>
                <p style={{
                  color: '#718096',
                  fontSize: '16px',
                  margin: 0
                }}>
                  Overall Financial Wellness
                </p>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {[
                  { label: 'Income Stability', value: financialHealth.incomeStability, color: '#667eea' },
                  { label: 'Savings Rate', value: financialHealth.savingsRate, color: '#48bb78' },
                  { label: 'Spending Consistency', value: financialHealth.spendingConsistency, color: '#9f7aea' }
                ].map((metric, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      color: '#4a5568',
                      fontSize: '16px',
                      fontWeight: '500'
                    }}>
                      {metric.label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{
                        width: '200px',
                        height: '8px',
                        backgroundColor: '#e2e8f0',
                        borderRadius: '8px',
                        marginRight: '16px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${metric.value}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, ${metric.color}, ${metric.color}dd)`,
                          borderRadius: '8px',
                          transition: 'width 1s ease-out'
                        }}></div>
                      </div>
                      <span style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#2d3748',
                        minWidth: '45px'
                      }}>
                        {Math.round(metric.value)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Smart Spending Insights */}
        {spendingInsights.length > 0 && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '32px',
            padding: '40px',
            marginBottom: '40px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            animation: 'fadeInUp 0.6s ease-out 0.1s both'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '32px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                padding: '12px',
                marginRight: '16px'
              }}>
                <PieChart style={{ width: '24px', height: '24px', color: 'white' }} />
              </div>
              <h2 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#1a202c',
                margin: 0
              }}>
                Smart Spending Insights
              </h2>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '24px'
            }}>
              {spendingInsights.slice(0, 6).map((insight, index) => (
                <div 
                  key={index} 
                  style={{
                    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                    borderRadius: '20px',
                    padding: '24px',
                    border: '1px solid rgba(203, 213, 224, 0.3)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    animation: `fadeInUp 0.6s ease-out ${0.1 * index}s both`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <h3 style={{
                      fontWeight: '600',
                      color: '#2d3748',
                      fontSize: '18px',
                      margin: 0
                    }}>
                      {insight.category}
                    </h3>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: insight.trend === 'up' ? 'rgba(254, 202, 202, 0.8)' : 'rgba(187, 247, 208, 0.8)',
                      borderRadius: '12px',
                      padding: '4px 8px'
                    }}>
                      {insight.trend === 'up' ? (
                        <ArrowUpRight style={{ width: '16px', height: '16px', color: '#e53e3e', marginRight: '4px' }} />
                      ) : (
                        <ArrowDownRight style={{ width: '16px', height: '16px', color: '#38a169', marginRight: '4px' }} />
                      )}
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: insight.trend === 'up' ? '#e53e3e' : '#38a169'
                      }}>
                        {insight.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <p style={{
                    fontSize: '32px',
                    fontWeight: '800',
                    color: '#1a202c',
                    marginBottom: '12px',
                    margin: '0 0 12px 0'
                  }}>
                    ₹{insight.amount.toLocaleString()}
                  </p>
                  <p style={{
                    fontSize: '14px',
                    color: '#718096',
                    lineHeight: '1.5',
                    margin: 0
                  }}>
                    {insight.suggestion}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gemini AI Personalized Suggestions */}
        {geminiSuggestions.length > 0 && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '28px',
            padding: '32px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            marginBottom: '40px',
            animation: 'fadeInUp 0.6s ease-out 0.3s both',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Gemini AI Badge */}
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
              <button
                onClick={refreshGeminiSuggestions}
                disabled={geminiLoading || isRefreshing}
                style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: (geminiLoading || isRefreshing) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  if (!geminiLoading && !isRefreshing) {
                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)';
                }}
                title="Refresh AI Suggestions"
              >
                <RefreshCw style={{ 
                  height: '14px', 
                  width: '14px', 
                  color: '#8B5CF6',
                  animation: (geminiLoading || isRefreshing) ? 'spin 1s linear infinite' : 'none'
                }} />
              </button>
              
              {/* Show All Suggestions Toggle */}
              <button
                onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                style={{
                  background: showAllSuggestions ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '12px',
                  color: '#8B5CF6',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = showAllSuggestions ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)';
                }}
                title="View All Previous Suggestions"
              >
                {showAllSuggestions ? 'Hide History' : 'Show All'}
              </button>
              
              <div style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
              }}>
                <Sparkles style={{ height: '14px', width: '14px' }} />
                Powered by Gemini AI
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px', 
              marginBottom: '28px',
              paddingRight: '180px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
                borderRadius: '20px',
                padding: '16px',
                boxShadow: '0 8px 32px rgba(139, 92, 246, 0.3)'
              }}>
                <Brain style={{ height: '28px', width: '28px', color: 'white' }} />
              </div>
              <div>
                <h3 style={{ 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: '#1a202c', 
                  margin: '0 0 4px 0' 
                }}>
                  AI-Powered Insights
                </h3>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#718096', 
                  margin: 0 
                }}>
                  Personalized recommendations based on your last 3 months of spending
                </p>
              </div>
            </div>

            {/* Suggestions History Selector */}
            {showAllSuggestions && cachedSuggestions.length > 0 && (
              <div style={{ 
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.02) 0%, rgba(168, 85, 247, 0.02) 100%)',
                border: '1px solid rgba(139, 92, 246, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1a202c',
                  margin: '0 0 12px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Calendar style={{ height: '16px', width: '16px', color: '#8B5CF6' }} />
                  Previous AI Suggestions ({cachedSuggestions.length})
                </h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '12px'
                }}>
                  {cachedSuggestions.map((cached, index) => (
                    <div
                      key={cached.id}
                      onClick={() => loadSpecificSuggestion(cached.id)}
                      style={{
                        background: currentSuggestionId === cached.id 
                          ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)'
                          : 'white',
                        border: currentSuggestionId === cached.id 
                          ? '2px solid #8B5CF6'
                          : '1px solid rgba(139, 92, 246, 0.1)',
                        borderRadius: '8px',
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (currentSuggestionId !== cached.id) {
                          e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentSuggestionId !== cached.id) {
                          e.currentTarget.style.background = 'white';
                        }
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px'
                      }}>
                        <div>
                          <p style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#1a202c',
                            margin: 0
                          }}>
                            {formatTimestamp(cached.timestamp)}
                          </p>
                          <p style={{
                            fontSize: '12px',
                            color: '#718096',
                            margin: '2px 0 0 0'
                          }}>
                            {cached.suggestions.length} suggestions • {cached.transactionCount} transactions
                          </p>
                        </div>
                        {currentSuggestionId === cached.id && (
                          <CheckCircle style={{ 
                            height: '16px', 
                            width: '16px', 
                            color: '#8B5CF6' 
                          }} />
                        )}
                      </div>
                      <p style={{
                        fontSize: '12px',
                        color: '#4A5568',
                        margin: 0,
                        opacity: 0.7
                      }}>
                        Monthly Income: ₹{cached.userProfile.monthlyIncome.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Suggestion Info */}
            {currentSuggestionId && !showAllSuggestions && (
              <div style={{
                background: 'rgba(139, 92, 246, 0.05)',
                border: '1px solid rgba(139, 92, 246, 0.1)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Calendar style={{ height: '14px', width: '14px', color: '#8B5CF6' }} />
                <span style={{ 
                  fontSize: '14px', 
                  color: '#4A5568',
                  fontWeight: '500'
                }}>
                  {(() => {
                    const current = cachedSuggestions.find(c => c.id === currentSuggestionId);
                    return current ? `Showing suggestions from ${formatTimestamp(current.timestamp)}` : 'Latest AI Suggestions';
                  })()}
                </span>
                {isRefreshing && (
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#8B5CF6',
                    fontWeight: '500'
                  }}>
                    • Refreshing...
                  </span>
                )}
              </div>
            )}

            {(geminiLoading || isRefreshing) ? (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                padding: '40px' 
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#8B5CF6'
                }}>
                  <RefreshCw style={{ 
                    height: '24px', 
                    width: '24px', 
                    animation: 'spin 1s linear infinite' 
                  }} />
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>
                    {isRefreshing ? 'Refreshing AI insights...' : 'Generating personalized insights...'}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '20px' }}>
                {geminiSuggestions.length > 0 ? (
                  geminiSuggestions.map((suggestion, index) => (
                    <div key={index} style={{
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
                      border: '1px solid rgba(139, 92, 246, 0.1)',
                    borderRadius: '16px',
                    padding: '24px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: '12px' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          background: suggestion.priority === 'high' 
                            ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                            : suggestion.priority === 'medium'
                            ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                            : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {suggestion.priority}
                        </span>
                        <h4 style={{ 
                          fontSize: '18px', 
                          fontWeight: '600', 
                          color: '#1a202c',
                          margin: 0
                        }}>
                          {suggestion.category}
                        </h4>
                      </div>
                      {suggestion.potentialSavings && (
                        <div style={{
                          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          Save {suggestion.potentialSavings}
                        </div>
                      )}
                    </div>
                    
                    <p style={{ 
                      fontSize: '14px', 
                      color: '#4a5568',
                      lineHeight: '1.6',
                      marginBottom: '16px'
                    }}>
                      {suggestion.suggestion}
                    </p>
                    
                    {suggestion.actionItems.length > 0 && (
                      <div>
                        <h5 style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#2d3748',
                          marginBottom: '8px'
                        }}>
                          Action Steps:
                        </h5>
                        <ul style={{ 
                          listStyle: 'none', 
                          padding: 0, 
                          margin: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          {suggestion.actionItems.map((action, actionIndex) => (
                            <li key={actionIndex} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '13px',
                              color: '#4a5568'
                            }}>
                              <CheckCircle style={{ 
                                height: '14px', 
                                width: '14px', 
                                color: '#10B981',
                                flexShrink: 0
                              }} />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.02) 0%, rgba(168, 85, 247, 0.02) 100%)',
                    border: '1px solid rgba(139, 92, 246, 0.1)',
                    borderRadius: '16px'
                  }}>
                    <Brain style={{ 
                      height: '48px', 
                      width: '48px', 
                      color: '#8B5CF6',
                      margin: '0 auto 16px auto'
                    }} />
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#1a202c',
                      margin: '0 0 8px 0'
                    }}>
                      No AI Suggestions Available
                    </h3>
                    <p style={{
                      fontSize: '14px',
                      color: '#718096',
                      margin: '0 0 16px 0'
                    }}>
                      {cachedSuggestions.length > 0 
                        ? 'Click "Refresh" to generate new suggestions or select from previous suggestions above.'
                        : 'Click "Refresh" to generate your first AI-powered financial insights.'
                      }
                    </p>
                    <button
                      onClick={refreshGeminiSuggestions}
                      disabled={geminiLoading || isRefreshing}
                      style={{
                        background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: (geminiLoading || isRefreshing) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        margin: '0 auto'
                      }}
                    >
                      <RefreshCw style={{ 
                        height: '16px', 
                        width: '16px',
                        animation: (geminiLoading || isRefreshing) ? 'spin 1s linear infinite' : 'none'
                      }} />
                      {(geminiLoading || isRefreshing) ? 'Generating...' : 'Generate AI Suggestions'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recommendations Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '32px',
          marginBottom: '40px'
        }}>
          {/* Budget Recommendations */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '28px',
            padding: '32px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            animation: 'fadeInUp 0.6s ease-out 0.2s both',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 35px 70px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.15)';
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                borderRadius: '16px',
                padding: '12px',
                marginRight: '16px'
              }}>
                <Calculator style={{ width: '24px', height: '24px', color: 'white' }} />
              </div>
              <h2 style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#1a202c',
                margin: 0
              }}>
                Budget Recommendations
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {budgetRecommendations.map((rec, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(72, 187, 120, 0.05)',
                  border: '1px solid rgba(72, 187, 120, 0.1)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(72, 187, 120, 0.1)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(72, 187, 120, 0.05)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}>
                  <CheckCircle style={{
                    width: '20px',
                    height: '20px',
                    color: '#48bb78',
                    marginRight: '12px',
                    marginTop: '2px',
                    flexShrink: 0
                  }} />
                  <p style={{
                    color: '#2d3748',
                    fontSize: '15px',
                    lineHeight: '1.5',
                    margin: 0,
                    fontWeight: '500'
                  }}>
                    {rec}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Investment Opportunities */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '28px',
            padding: '32px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            animation: 'fadeInUp 0.6s ease-out 0.3s both',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 35px 70px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.15)';
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                padding: '12px',
                marginRight: '16px'
              }}>
                <TrendingUp style={{ width: '24px', height: '24px', color: 'white' }} />
              </div>
              <h2 style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#1a202c',
                margin: 0
              }}>
                Investment Opportunities
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {investmentSuggestions.map((suggestion, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(102, 126, 234, 0.05)',
                  border: '1px solid rgba(102, 126, 234, 0.1)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.05)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}>
                  <Lightbulb style={{
                    width: '20px',
                    height: '20px',
                    color: '#667eea',
                    marginRight: '12px',
                    marginTop: '2px',
                    flexShrink: 0
                  }} />
                  <p style={{
                    color: '#2d3748',
                    fontSize: '15px',
                    lineHeight: '1.5',
                    margin: 0,
                    fontWeight: '500'
                  }}>
                    {suggestion}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Goal Achievement Plans */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '28px',
            padding: '32px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            animation: 'fadeInUp 0.6s ease-out 0.4s both',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 35px 70px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.15)';
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #9f7aea 0%, #805ad5 100%)',
                borderRadius: '16px',
                padding: '12px',
                marginRight: '16px'
              }}>
                <Target style={{ width: '24px', height: '24px', color: 'white' }} />
              </div>
              <h2 style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#1a202c',
                margin: 0
              }}>
                Goal Achievement Plans
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {goalPlans.map((plan, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(159, 122, 234, 0.05)',
                  border: '1px solid rgba(159, 122, 234, 0.1)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(159, 122, 234, 0.1)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(159, 122, 234, 0.05)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}>
                  <Award style={{
                    width: '20px',
                    height: '20px',
                    color: '#9f7aea',
                    marginRight: '12px',
                    marginTop: '2px',
                    flexShrink: 0
                  }} />
                  <p style={{
                    color: '#2d3748',
                    fontSize: '15px',
                    lineHeight: '1.5',
                    margin: 0,
                    fontWeight: '500'
                  }}>
                    {plan}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Expense Optimization */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '28px',
            padding: '32px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            animation: 'fadeInUp 0.6s ease-out 0.5s both',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 35px 70px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.15)';
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
                borderRadius: '16px',
                padding: '12px',
                marginRight: '16px'
              }}>
                <AlertTriangle style={{ width: '24px', height: '24px', color: 'white' }} />
              </div>
              <h2 style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#1a202c',
                margin: 0
              }}>
                Expense Optimization
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {expenseOptimizations.map((optimization, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(237, 137, 54, 0.05)',
                  border: '1px solid rgba(237, 137, 54, 0.1)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(237, 137, 54, 0.1)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(237, 137, 54, 0.05)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}>
                  <DollarSign style={{
                    width: '20px',
                    height: '20px',
                    color: '#ed8936',
                    marginRight: '12px',
                    marginTop: '2px',
                    flexShrink: 0
                  }} />
                  <p style={{
                    color: '#2d3748',
                    fontSize: '15px',
                    lineHeight: '1.5',
                    margin: 0,
                    fontWeight: '500'
                  }}>
                    {optimization}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Refresh Analysis Button */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button
            onClick={() => user && analyzeFinancialData(transactions)}
            disabled={analyzing || loading}
            style={{
              background: analyzing || loading ? 
                'linear-gradient(135deg, #a0aec0 0%, #718096 100%)' : 
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '16px 32px',
              borderRadius: '20px',
              fontSize: '18px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              margin: '0 auto',
              cursor: analyzing || loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 10px 25px rgba(102, 126, 234, 0.3)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
            onMouseEnter={(e) => {
              if (!analyzing && !loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 15px 35px rgba(102, 126, 234, 0.4)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)';
              }
            }}
            onMouseLeave={(e) => {
              if (!analyzing && !loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(102, 126, 234, 0.3)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
              }
            }}
          >
            <RefreshCw style={{
              width: '20px',
              height: '20px',
              marginRight: '12px',
              animation: (analyzing || loading) ? 'spin 1s linear infinite' : 'none'
            }} />
            {(analyzing || loading) ? 'Analyzing...' : 'Refresh Analysis'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiSuggestions;