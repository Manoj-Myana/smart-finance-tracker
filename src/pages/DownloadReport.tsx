import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar, Filter, TrendingUp, PieChart, BarChart, Search, IndianRupee, X } from 'lucide-react';

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

interface ReportConfig {
  type: 'transactions' | 'budget' | 'analytics' | 'summary';
  format: 'pdf' | 'excel' | 'csv';
  dateRange: 'all' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate: string;
  endDate: string;
  includeCharts: boolean;
  // Filter options
  transactionType: 'all' | 'credit' | 'debit';
  frequency: 'all' | 'regular' | 'irregular';
  searchTerm: string;
  amountMin: string;
  amountMax: string;
}

interface RecentReport {
  id: string;
  title: string;
  type: 'transactions' | 'budget' | 'analytics' | 'summary';
  format: 'pdf' | 'excel' | 'csv';
  generatedAt: string;
  filters: {
    dateRange: string;
    transactionType: string;
    frequency: string;
    searchTerm?: string;
    amountRange?: string;
  };
  dataSnapshot: {
    totalTransactions: number;
    totalCredit: number;
    totalDebit: number;
    balance: number;
  };
  reportData: any; // Store the actual report data for re-download
  size: string; // File size estimate
}

const DownloadReport: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [previewReport, setPreviewReport] = useState<RecentReport | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'recent'>('generate');
  const [config, setConfig] = useState<ReportConfig>({
    type: 'transactions',
    format: 'pdf',
    dateRange: 'all',
    startDate: '',
    endDate: '',
    includeCharts: true,
    transactionType: 'all',
    frequency: 'all',
    searchTerm: '',
    amountMin: '',
    amountMax: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Load user data and transactions
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        fetchTransactions(parsedUser.id);
        loadRecentReports(parsedUser.id);
      } catch (error) {
        console.error('Error parsing user data:', error);
        setLoading(false);
      }
    } else {
      setLoading(false);
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
    } finally {
      setLoading(false);
    }
  };

  // Load recent reports from localStorage
  const loadRecentReports = (userId: number) => {
    try {
      const savedReports = localStorage.getItem(`recentReports_${userId}`);
      if (savedReports) {
        const reports = JSON.parse(savedReports);
        // Sort by generation date (newest first)
        reports.sort((a: RecentReport, b: RecentReport) => 
          new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
        );
        setRecentReports(reports.slice(0, 10)); // Keep only last 10 reports
      }
    } catch (error) {
      console.error('Error loading recent reports:', error);
    }
  };

  // Save report to recent reports
  const saveToRecentReports = (reportData: any) => {
    if (!user) return;

    const newReport: RecentReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `${reportData.title} - ${new Date().toLocaleDateString()}`,
      type: config.type,
      format: config.format,
      generatedAt: new Date().toISOString(),
      filters: {
        dateRange: config.dateRange,
        transactionType: config.transactionType,
        frequency: config.frequency,
        searchTerm: config.searchTerm || undefined,
        amountRange: config.amountMin || config.amountMax 
          ? `₹${config.amountMin || '0'} - ₹${config.amountMax || '∞'}` 
          : 'All'
      },
      dataSnapshot: {
        totalTransactions: reportData.statistics.totalTransactions,
        totalCredit: reportData.statistics.totalCredit,
        totalDebit: reportData.statistics.totalDebit,
        balance: reportData.statistics.balance
      },
      reportData: reportData,
      size: estimateFileSize(reportData, config.format)
    };

    const updatedReports = [newReport, ...recentReports].slice(0, 10);
    setRecentReports(updatedReports);
    
    // Save to localStorage
    try {
      localStorage.setItem(`recentReports_${user.id}`, JSON.stringify(updatedReports));
    } catch (error) {
      console.error('Error saving recent report:', error);
    }
  };

  // Estimate file size
  const estimateFileSize = (reportData: any, format: string): string => {
    const transactionCount = reportData.statistics.totalTransactions;
    let baseSize = 0;

    switch (format) {
      case 'pdf':
        baseSize = 50 + (transactionCount * 0.5); // KB
        break;
      case 'excel':
        baseSize = 30 + (transactionCount * 0.3); // KB
        break;
      case 'csv':
        baseSize = 10 + (transactionCount * 0.1); // KB
        break;
    }

    if (reportData.config?.includeCharts) {
      baseSize += 20; // Additional KB for charts
    }

    if (baseSize < 1024) {
      return `${Math.round(baseSize)} KB`;
    } else {
      return `${(baseSize / 1024).toFixed(1)} MB`;
    }
  };

  // Delete report from recent reports
  const deleteRecentReport = (reportId: string) => {
    if (!user) return;
    
    const updatedReports = recentReports.filter(report => report.id !== reportId);
    setRecentReports(updatedReports);
    
    try {
      localStorage.setItem(`recentReports_${user.id}`, JSON.stringify(updatedReports));
    } catch (error) {
      console.error('Error deleting recent report:', error);
    }
  };

  // Preview report
  const previewReportHandler = (report: RecentReport) => {
    setPreviewReport(report);
    setShowPreview(true);
  };

  // Download existing report
  const downloadExistingReport = async (report: RecentReport) => {
    try {
      await downloadReport(report.reportData, report.format);
    } catch (error) {
      console.error('Error downloading existing report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  // Filter transactions based on selected criteria
  const getFilteredTransactions = () => {
    return transactions.filter(transaction => {
      // Type filter
      const matchesType = config.transactionType === 'all' || transaction.type === config.transactionType;
      
      // Frequency filter
      const matchesFrequency = config.frequency === 'all' || transaction.frequency === config.frequency;
      
      // Search filter
      const matchesSearch = config.searchTerm === '' || 
        transaction.description.toLowerCase().includes(config.searchTerm.toLowerCase());
      
      // Date filter
      let matchesDate = true;
      if (config.dateRange === 'custom' && config.startDate && config.endDate) {
        const transactionDate = new Date(transaction.date);
        const startDate = new Date(config.startDate);
        const endDate = new Date(config.endDate);
        matchesDate = transactionDate >= startDate && transactionDate <= endDate;
      } else if (config.dateRange !== 'custom' && config.dateRange !== 'all') {
        const now = new Date();
        const transactionDate = new Date(transaction.date);
        let cutoffDate = new Date();
        
        switch (config.dateRange) {
          case 'week':
            cutoffDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            cutoffDate.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            cutoffDate.setMonth(now.getMonth() - 3);
            break;
          case 'year':
            cutoffDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        matchesDate = transactionDate >= cutoffDate;
      }
      
      // Amount filter
      let matchesAmount = true;
      if (config.amountMin && transaction.amount < parseFloat(config.amountMin)) {
        matchesAmount = false;
      }
      if (config.amountMax && transaction.amount > parseFloat(config.amountMax)) {
        matchesAmount = false;
      }
      
      return matchesType && matchesFrequency && matchesSearch && matchesDate && matchesAmount;
    });
  };

  const filteredTransactions = getFilteredTransactions();

  // Calculate statistics
  const totalCredit = filteredTransactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalDebit = filteredTransactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalCredit - totalDebit;
  const averageTransaction = filteredTransactions.length > 0 
    ? (totalCredit + totalDebit) / filteredTransactions.length 
    : 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const reportTypes = [
    {
      type: 'transactions' as const,
      title: 'Transaction Report',
      description: 'Detailed list of all your transactions with categories and trends',
      icon: <FileText className="h-6 w-6" />
    },
    {
      type: 'budget' as const,
      title: 'Budget Analysis',
      description: 'Budget vs actual spending analysis with recommendations',
      icon: <PieChart className="h-6 w-6" />
    },
    {
      type: 'analytics' as const,
      title: 'Financial Analytics',
      description: 'Comprehensive financial analysis with insights and projections',
      icon: <TrendingUp className="h-6 w-6" />
    },
    {
      type: 'summary' as const,
      title: 'Executive Summary',
      description: 'High-level overview of your financial health and key metrics',
      icon: <BarChart className="h-6 w-6" />
    }
  ];

  // Helper function to get type-specific colors
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'transactions': return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      case 'budget': return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      case 'analytics': return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
      case 'summary': return 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
      default: return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
  };

  const formatOptions = [
    { value: 'pdf' as const, label: 'PDF Document', description: 'Best for viewing and printing' },
    { value: 'excel' as const, label: 'Excel Spreadsheet', description: 'Best for data analysis' },
    { value: 'csv' as const, label: 'CSV File', description: 'Best for data import/export' }
  ];

  const dateRangeOptions = [
    { value: 'all' as const, label: 'All Time' },
    { value: 'week' as const, label: 'Last 7 days' },
    { value: 'month' as const, label: 'Last 30 days' },
    { value: 'quarter' as const, label: 'Last 3 months' },
    { value: 'year' as const, label: 'Last 12 months' },
    { value: 'custom' as const, label: 'Custom date range' }
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      // Generate report data based on selected type
      const reportData = await generateReportDataByType();
      
      // Simulate API call for report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Generating report with data:', reportData);
      
      // Save to recent reports before downloading
      saveToRecentReports(reportData);
      
      // Create a downloadable file based on format
      await downloadReport(reportData);
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateReportDataByType = async () => {
    const baseData = {
      user: user,
      transactions: filteredTransactions,
      statistics: {
        totalTransactions: filteredTransactions.length,
        totalCredit: totalCredit,
        totalDebit: totalDebit,
        balance: balance,
        averageTransaction: averageTransaction,
        creditTransactions: filteredTransactions.filter(t => t.type === 'credit').length,
        debitTransactions: filteredTransactions.filter(t => t.type === 'debit').length
      },
      filters: {
        dateRange: config.dateRange,
        startDate: config.startDate,
        endDate: config.endDate,
        transactionType: config.transactionType,
        frequency: config.frequency,
        searchTerm: config.searchTerm,
        amountRange: config.amountMin || config.amountMax 
          ? `₹${config.amountMin || '0'} - ₹${config.amountMax || '∞'}` 
          : 'All'
      },
      config: config,
      generatedAt: new Date().toISOString(),
      reportType: config.type
    };

    // Add specific data based on report type
    switch (config.type) {
      case 'transactions':
        return {
          ...baseData,
          title: 'Transaction Report',
          subtitle: 'Detailed transaction history with comprehensive analysis',
          sections: ['filters', 'summary', 'charts', 'transactions', 'insights'],
          insights: generateTransactionInsights(filteredTransactions),
          categorization: categorizeTransactions(filteredTransactions)
        };

      case 'budget':
        return {
          ...baseData,
          title: 'Budget Analysis Report',
          subtitle: 'Budget performance and spending pattern analysis',
          sections: ['filters', 'budget-summary', 'charts', 'budget-analysis', 'recommendations'],
          budgetData: generateBudgetAnalysis(filteredTransactions),
          recommendations: generateBudgetRecommendations(filteredTransactions)
        };

      case 'analytics':
        return {
          ...baseData,
          title: 'Financial Analytics Report',
          subtitle: 'Comprehensive financial analysis with trends and projections',
          sections: ['filters', 'analytics-summary', 'charts', 'trends', 'projections', 'insights'],
          analytics: generateAdvancedAnalytics(filteredTransactions),
          trends: generateTrendAnalysis(filteredTransactions),
          projections: generateProjections(filteredTransactions)
        };

      case 'summary':
        return {
          ...baseData,
          title: 'Executive Summary Report',
          subtitle: 'High-level financial overview and key performance indicators',
          sections: ['executive-summary', 'key-metrics', 'charts', 'highlights'],
          executiveSummary: generateExecutiveSummary(filteredTransactions),
          keyMetrics: generateKeyMetrics(filteredTransactions),
          highlights: generateFinancialHighlights(filteredTransactions)
        };

      default:
        return baseData;
    }
  };

  const downloadReport = async (reportData: any, format?: string) => {
    const reportFormat = format || config.format;
    const reportType = reportData.reportType || config.type;
    const baseFileName = `${reportType}_report_${new Date().toISOString().split('T')[0]}`;
    
    if (reportFormat === 'csv') {
      // Generate CSV with chart data if enabled
      const csvContent = generateCSV(reportData.transactions, reportData);
      downloadFile(csvContent, `${baseFileName}.csv`, 'text/csv');
    } else if (reportFormat === 'excel') {
      // Generate Excel-compatible CSV with enhanced formatting and charts
      const excelContent = generateExcelCSV(reportData);
      downloadFile(excelContent, `${baseFileName}.xls`, 'application/vnd.ms-excel');
    } else if (reportFormat === 'pdf') {
      // Generate HTML content that can be converted to PDF with charts
      const htmlContent = generateHTMLForPDF(reportData);
      // Create a blob with HTML content that browsers can handle
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      
      // Open in new window for printing/saving as PDF
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            window.URL.revokeObjectURL(url);
          }, 250);
        };
      }
      return;
    }
    
    alert(`Report "${baseFileName}.${config.format}" has been downloaded successfully!`);
  };

  const generateCSV = (transactions: Transaction[], reportData?: any) => {
    const includeCharts = reportData?.config?.includeCharts || false;
    const headers = ['Date', 'Description', 'Amount', 'Type', 'Frequency', 'Created At'];
    const csvRows = [];
    
    // Add header information if charts are included
    if (includeCharts && reportData) {
      csvRows.push(['FINANCIAL REPORT WITH CHARTS']);
      csvRows.push([`Generated on: ${new Date(reportData.generatedAt).toLocaleDateString()}`]);
      csvRows.push([`Charts Included: Yes`]);
      csvRows.push(['']);
      
      // Add summary
      csvRows.push(['SUMMARY']);
      csvRows.push([`Total Transactions: ${reportData.statistics.totalTransactions}`]);
      csvRows.push([`Credit vs Debit: ${reportData.statistics.creditTransactions}:${reportData.statistics.debitTransactions}`]);
      csvRows.push([`Balance: ${formatCurrency(reportData.statistics.balance)}`]);
      csvRows.push(['']);
    }
    
    csvRows.push(headers);
    
    transactions.forEach(transaction => {
      const row = [
        transaction.date,
        `"${transaction.description}"`,
        transaction.amount,
        transaction.type,
        transaction.frequency,
        transaction.created_at
      ];
      csvRows.push(row);
    });
    
    return csvRows.map(row => row.join(',')).join('\n');
  };

  const generateExcelCSV = (reportData: any) => {
    const lines = [];
    const includeCharts = reportData.config?.includeCharts || false;
    
    lines.push('FINANCIAL REPORT');
    lines.push(`Generated on: ${new Date(reportData.generatedAt).toLocaleDateString()}`);
    lines.push(`User: ${reportData.user?.fullName || 'Unknown'}`);
    lines.push(`Charts Included: ${includeCharts ? 'Yes' : 'No'}`);
    lines.push('');
    
    // Summary
    lines.push('SUMMARY');
    lines.push(`Total Transactions,${reportData.statistics.totalTransactions}`);
    lines.push(`Total Credit,${reportData.statistics.totalCredit}`);
    lines.push(`Total Debit,${reportData.statistics.totalDebit}`);
    lines.push(`Balance,${reportData.statistics.balance}`);
    lines.push(`Average Transaction,${reportData.statistics.averageTransaction.toFixed(2)}`);
    lines.push(`Credit Transactions,${reportData.statistics.creditTransactions}`);
    lines.push(`Debit Transactions,${reportData.statistics.debitTransactions}`);
    lines.push('');
    
    // Add chart data if charts are included
    if (includeCharts) {
      lines.push('CHART ANALYSIS');
      lines.push('');
      
      // Credit vs Debit Analysis
      lines.push('CREDIT VS DEBIT BREAKDOWN');
      lines.push(`Credit Percentage,${((reportData.statistics.creditTransactions/reportData.statistics.totalTransactions)*100).toFixed(1)}%`);
      lines.push(`Debit Percentage,${((reportData.statistics.debitTransactions/reportData.statistics.totalTransactions)*100).toFixed(1)}%`);
      lines.push('');
      
      // Amount Distribution Analysis
      lines.push('AMOUNT DISTRIBUTION');
      const under1k = reportData.transactions.filter((t: Transaction) => t.amount < 1000).length;
      const between1k5k = reportData.transactions.filter((t: Transaction) => t.amount >= 1000 && t.amount < 5000).length;
      const between5k10k = reportData.transactions.filter((t: Transaction) => t.amount >= 5000 && t.amount < 10000).length;
      const above10k = reportData.transactions.filter((t: Transaction) => t.amount >= 10000).length;
      
      lines.push(`Under ₹1000,${under1k}`);
      lines.push(`₹1000-₹5000,${between1k5k}`);
      lines.push(`₹5000-₹10000,${between5k10k}`);
      lines.push(`Above ₹10000,${above10k}`);
      lines.push('');
      
      // Frequency Analysis
      lines.push('FREQUENCY ANALYSIS');
      const regularCount = reportData.transactions.filter((t: Transaction) => t.frequency === 'regular').length;
      const irregularCount = reportData.transactions.filter((t: Transaction) => t.frequency === 'irregular').length;
      lines.push(`Regular Transactions,${regularCount} (${((regularCount/reportData.statistics.totalTransactions)*100).toFixed(1)}%)`);
      lines.push(`Irregular Transactions,${irregularCount} (${((irregularCount/reportData.statistics.totalTransactions)*100).toFixed(1)}%)`);
      lines.push('');
      
      // Monthly Trend Data
      const monthlyData = generateMonthlyData(reportData.transactions);
      lines.push('MONTHLY TRANSACTION TREND');
      lines.push('Month,Transaction Count');
      monthlyData.labels.forEach((month: string, index: number) => {
        lines.push(`${month},${monthlyData.data[index]}`);
      });
      lines.push('');
      
      // Insights
      lines.push('FINANCIAL INSIGHTS');
      const avgAmount = reportData.statistics.averageTransaction;
      const maxAmount = Math.max(...reportData.transactions.map((t: Transaction) => t.amount));
      const minAmount = Math.min(...reportData.transactions.map((t: Transaction) => t.amount));
      
      lines.push(`Average Transaction Amount,₹${avgAmount.toFixed(2)}`);
      lines.push(`Highest Transaction,₹${maxAmount.toFixed(2)}`);
      lines.push(`Lowest Transaction,₹${minAmount.toFixed(2)}`);
      lines.push(`Spending Pattern,${regularCount > irregularCount ? 'Regular - Good financial habits' : 'Irregular - Consider more structured spending'}`);
      lines.push(`Balance Status,${reportData.statistics.balance >= 0 ? 'Positive - Healthy finances' : 'Negative - Monitor spending'}`);
      lines.push('');
    }
    
    // Transactions
    lines.push('TRANSACTIONS');
    lines.push('Date,Description,Amount,Type,Frequency,Created At');
    
    reportData.transactions.forEach((transaction: Transaction) => {
      lines.push([
        transaction.date,
        `"${transaction.description}"`,
        transaction.amount,
        transaction.type,
        transaction.frequency,
        transaction.created_at
      ].join(','));
    });
    
    return lines.join('\n');
  };

  // Helper functions for different report types
  const generateTransactionInsights = (transactions: Transaction[]) => {
    const insights = [];
    const frequencyMap = transactions.reduce((acc, t) => {
      acc[t.frequency] = (acc[t.frequency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgAmount = transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length;
    const maxTransaction = Math.max(...transactions.map(t => t.amount));
    const minTransaction = Math.min(...transactions.map(t => t.amount));

    insights.push({
      type: 'spending_pattern',
      title: 'Spending Pattern Analysis',
      content: `Your transactions show ${frequencyMap.regular > frequencyMap.irregular ? 'regular' : 'irregular'} spending patterns with an average transaction of ${formatCurrency(avgAmount)}.`
    });

    insights.push({
      type: 'transaction_range',
      title: 'Transaction Range',
      content: `Transaction amounts range from ${formatCurrency(minTransaction)} to ${formatCurrency(maxTransaction)}, indicating ${maxTransaction - minTransaction > 50000 ? 'varied' : 'consistent'} spending behavior.`
    });

    return insights;
  };

  const generateBudgetAnalysis = (transactions: Transaction[]) => {
    const monthlySpending = transactions.reduce((acc, t) => {
      const month = new Date(t.date).toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + (t.type === 'debit' ? t.amount : 0);
      return acc;
    }, {} as Record<string, number>);

    const avgMonthlySpending = Object.values(monthlySpending).reduce((a, b) => a + b, 0) / Object.keys(monthlySpending).length;
    
    return {
      monthlySpending,
      avgMonthlySpending,
      budgetVariance: Object.values(monthlySpending).map(spending => ({
        month: Object.keys(monthlySpending)[Object.values(monthlySpending).indexOf(spending)],
        actual: spending,
        variance: spending - avgMonthlySpending
      }))
    };
  };

  const generateBudgetRecommendations = (transactions: Transaction[]) => {
    const recommendations = [];
    const totalDebit = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
    const totalCredit = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);

    if (totalDebit > totalCredit * 0.8) {
      recommendations.push({
        priority: 'high',
        category: 'spending',
        title: 'Reduce Spending',
        description: 'Your spending is quite high relative to income. Consider reducing discretionary expenses.'
      });
    }

    recommendations.push({
      priority: 'medium',
      category: 'saving',
      title: 'Emergency Fund',
      description: 'Build an emergency fund covering 3-6 months of expenses for financial security.'
    });

    return recommendations;
  };

  const generateAdvancedAnalytics = (transactions: Transaction[]) => {
    const analytics = {
      cashFlow: {
        netFlow: transactions.reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0),
        volatility: calculateVolatility(transactions),
        trend: calculateTrend(transactions)
      },
      categorization: categorizeTransactions(transactions),
      seasonality: analyzeSeasonality(transactions)
    };

    return analytics;
  };

  const generateTrendAnalysis = (transactions: Transaction[]) => {
    const monthlyData = transactions.reduce((acc, t) => {
      const month = new Date(t.date).toISOString().slice(0, 7);
      if (!acc[month]) acc[month] = { credit: 0, debit: 0, count: 0 };
      acc[month][t.type] += t.amount;
      acc[month].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return {
      monthlyData,
      growthRate: calculateGrowthRate(monthlyData),
      predictedNextMonth: predictNextMonth(monthlyData)
    };
  };

  const generateProjections = (transactions: Transaction[]) => {
    const recentTransactions = transactions.slice(-30); // Last 30 transactions
    const avgIncome = recentTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0) / recentTransactions.filter(t => t.type === 'credit').length;
    const avgExpense = recentTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0) / recentTransactions.filter(t => t.type === 'debit').length;

    return {
      next3Months: {
        expectedIncome: avgIncome * 3,
        expectedExpenses: avgExpense * 3,
        projectedBalance: (avgIncome - avgExpense) * 3
      },
      yearEnd: {
        expectedIncome: avgIncome * 12,
        expectedExpenses: avgExpense * 12,
        projectedBalance: (avgIncome - avgExpense) * 12
      }
    };
  };

  const generateExecutiveSummary = (transactions: Transaction[]) => {
    const totalCredit = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    const totalDebit = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
    const netPosition = totalCredit - totalDebit;

    return {
      overview: `Financial analysis of ${transactions.length} transactions showing ${netPosition >= 0 ? 'positive' : 'negative'} net position of ${formatCurrency(Math.abs(netPosition))}.`,
      healthScore: calculateFinancialHealthScore(transactions),
      keyFindings: [
        `${netPosition >= 0 ? 'Surplus' : 'Deficit'} of ${formatCurrency(Math.abs(netPosition))}`,
        `Average transaction value: ${formatCurrency(transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length)}`,
        `Transaction frequency: ${transactions.length} transactions in selected period`
      ]
    };
  };

  const generateKeyMetrics = (transactions: Transaction[]) => {
    return {
      liquidityRatio: calculateLiquidityRatio(transactions),
      savingsRate: calculateSavingsRate(transactions),
      expenseRatio: calculateExpenseRatio(transactions),
      transactionVelocity: transactions.length / getDaysBetween(transactions)
    };
  };

  const generateFinancialHighlights = (transactions: Transaction[]) => {
    const highlights = [];
    const largestTransaction = transactions.reduce((max, t) => t.amount > max.amount ? t : max, transactions[0]);
    const mostFrequentType = transactions.filter(t => t.type === 'credit').length > transactions.filter(t => t.type === 'debit').length ? 'credit' : 'debit';

    highlights.push({
      title: 'Largest Transaction',
      value: formatCurrency(largestTransaction.amount),
      description: `${largestTransaction.type} - ${largestTransaction.description}`,
      type: largestTransaction.type
    });

    highlights.push({
      title: 'Most Active Type',
      value: mostFrequentType.toUpperCase(),
      description: `${transactions.filter(t => t.type === mostFrequentType).length} ${mostFrequentType} transactions`,
      type: mostFrequentType
    });

    return highlights;
  };

  // Utility functions for calculations
  const categorizeTransactions = (transactions: Transaction[]) => {
    return transactions.reduce((acc, t) => {
      const category = t.amount > 10000 ? 'High Value' : t.amount > 1000 ? 'Medium Value' : 'Low Value';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const calculateVolatility = (transactions: Transaction[]) => {
    const amounts = transactions.map(t => t.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((acc, amount) => acc + Math.pow(amount - mean, 2), 0) / amounts.length;
    return Math.sqrt(variance);
  };

  const calculateTrend = (transactions: Transaction[]) => {
    const monthlyAmounts = transactions.reduce((acc, t) => {
      const month = new Date(t.date).toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    const values = Object.values(monthlyAmounts);
    if (values.length < 2) return 0;
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2)).reduce((a, b) => a + b, 0);
    const secondHalf = values.slice(Math.floor(values.length / 2)).reduce((a, b) => a + b, 0);
    
    return secondHalf > firstHalf ? 1 : -1; // 1 for increasing, -1 for decreasing
  };

  const analyzeSeasonality = (transactions: Transaction[]) => {
    const monthlyData = transactions.reduce((acc, t) => {
      const month = new Date(t.date).getMonth();
      acc[month] = (acc[month] || 0) + t.amount;
      return acc;
    }, {} as Record<number, number>);

    return monthlyData;
  };

  const calculateGrowthRate = (monthlyData: Record<string, any>) => {
    const months = Object.keys(monthlyData).sort();
    if (months.length < 2) return 0;
    
    const firstMonth = monthlyData[months[0]];
    const lastMonth = monthlyData[months[months.length - 1]];
    
    return ((lastMonth.credit - firstMonth.credit) / firstMonth.credit) * 100;
  };

  const predictNextMonth = (monthlyData: Record<string, any>) => {
    const values = Object.values(monthlyData) as any[];
    const avgCredit = values.reduce((sum, m) => sum + m.credit, 0) / values.length;
    const avgDebit = values.reduce((sum, m) => sum + m.debit, 0) / values.length;
    
    return { credit: avgCredit, debit: avgDebit, netFlow: avgCredit - avgDebit };
  };

  const calculateFinancialHealthScore = (transactions: Transaction[]) => {
    const totalCredit = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    const totalDebit = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
    const ratio = totalCredit / (totalDebit + totalCredit);
    
    if (ratio > 0.6) return { score: 85, rating: 'Excellent' };
    if (ratio > 0.5) return { score: 70, rating: 'Good' };
    if (ratio > 0.4) return { score: 55, rating: 'Fair' };
    return { score: 35, rating: 'Needs Improvement' };
  };

  const calculateLiquidityRatio = (transactions: Transaction[]) => {
    const recentCredits = transactions.filter(t => t.type === 'credit').slice(-10);
    const recentDebits = transactions.filter(t => t.type === 'debit').slice(-10);
    
    const avgCredit = recentCredits.reduce((sum, t) => sum + t.amount, 0) / recentCredits.length;
    const avgDebit = recentDebits.reduce((sum, t) => sum + t.amount, 0) / recentDebits.length;
    
    return avgCredit / avgDebit;
  };

  const calculateSavingsRate = (transactions: Transaction[]) => {
    const totalCredit = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    const totalDebit = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
    
    return ((totalCredit - totalDebit) / totalCredit) * 100;
  };

  const calculateExpenseRatio = (transactions: Transaction[]) => {
    const totalCredit = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    const totalDebit = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
    
    return (totalDebit / totalCredit) * 100;
  };

  const getDaysBetween = (transactions: Transaction[]) => {
    if (transactions.length === 0) return 1;
    const dates = transactions.map(t => new Date(t.date));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const generateTypeSpecificContent = (reportData: any) => {
    const reportType = reportData.reportType || 'transactions';
    
    switch (reportType) {
      case 'transactions':
        return `
          <div class="section">
            <div class="section-title">Summary</div>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Total Transactions</div>
                <div class="summary-value">${reportData.statistics.totalTransactions}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Total Credit</div>
                <div class="summary-value credit">${formatCurrency(reportData.statistics.totalCredit)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Total Debit</div>
                <div class="summary-value debit">${formatCurrency(reportData.statistics.totalDebit)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Net Balance</div>
                <div class="summary-value ${reportData.statistics.balance >= 0 ? 'credit' : 'debit'}">${formatCurrency(reportData.statistics.balance)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Average Transaction</div>
                <div class="summary-value">${formatCurrency(reportData.statistics.averageTransaction)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Credit vs Debit</div>
                <div class="summary-value">${reportData.statistics.creditTransactions} : ${reportData.statistics.debitTransactions}</div>
              </div>
            </div>
          </div>
          
          ${reportData.insights ? `
          <div class="section">
            <div class="section-title">Transaction Insights</div>
            ${reportData.insights.map((insight: any) => `
              <div class="insight-item">
                <div class="insight-title">${insight.title}</div>
                <div>${insight.content}</div>
              </div>
            `).join('')}
          </div>
          ` : ''}
        `;
        
      case 'budget':
        return `
          <div class="section">
            <div class="section-title">Budget Summary</div>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Total Transactions</div>
                <div class="summary-value">${reportData.statistics.totalTransactions}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Monthly Average Spending</div>
                <div class="summary-value debit">${formatCurrency(reportData.budgetData?.avgMonthlySpending || 0)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Total Income</div>
                <div class="summary-value credit">${formatCurrency(reportData.statistics.totalCredit)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Total Expenses</div>
                <div class="summary-value debit">${formatCurrency(reportData.statistics.totalDebit)}</div>
              </div>
            </div>
          </div>
          
          ${reportData.recommendations ? `
          <div class="section">
            <div class="section-title">Budget Recommendations</div>
            ${reportData.recommendations.map((rec: any) => `
              <div class="recommendation-item">
                <div class="recommendation-title">${rec.title} (${rec.priority.toUpperCase()} Priority)</div>
                <div>${rec.description}</div>
                <small><strong>Category:</strong> ${rec.category}</small>
              </div>
            `).join('')}
          </div>
          ` : ''}
        `;
        
      case 'analytics':
        return `
          <div class="section">
            <div class="section-title">Financial Analytics</div>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Net Cash Flow</div>
                <div class="summary-value ${reportData.analytics?.cashFlow?.netFlow >= 0 ? 'credit' : 'debit'}">${formatCurrency(reportData.analytics?.cashFlow?.netFlow || 0)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Volatility Score</div>
                <div class="summary-value">${reportData.analytics?.cashFlow?.volatility?.toFixed(2) || 'N/A'}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Growth Trend</div>
                <div class="summary-value">${reportData.trends?.growthRate?.toFixed(2) || 0}%</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Projected Next Month</div>
                <div class="summary-value">${formatCurrency(reportData.trends?.predictedNextMonth?.netFlow || 0)}</div>
              </div>
            </div>
          </div>
          
          ${reportData.projections ? `
          <div class="section">
            <div class="section-title">Financial Projections</div>
            <div class="metric-grid">
              <div class="metric-card">
                <div class="metric-value">${formatCurrency(reportData.projections.next3Months?.projectedBalance || 0)}</div>
                <div class="metric-label">3-Month Projection</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${formatCurrency(reportData.projections.yearEnd?.projectedBalance || 0)}</div>
                <div class="metric-label">Year-End Projection</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${formatCurrency(reportData.projections.next3Months?.expectedIncome || 0)}</div>
                <div class="metric-label">Expected 3M Income</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${formatCurrency(reportData.projections.next3Months?.expectedExpenses || 0)}</div>
                <div class="metric-label">Expected 3M Expenses</div>
              </div>
            </div>
          </div>
          ` : ''}
        `;
        
      case 'summary':
        return `
          <div class="section">
            <div class="section-title">Executive Summary</div>
            ${reportData.executiveSummary ? `
              <div class="insight-item">
                <div class="insight-title">Financial Overview</div>
                <div>${reportData.executiveSummary.overview}</div>
                <div style="margin-top: 10px;"><strong>Health Score:</strong> ${reportData.executiveSummary.healthScore?.score || 'N/A'}/100 (${reportData.executiveSummary.healthScore?.rating || 'N/A'})</div>
              </div>
            ` : ''}
          </div>
          
          ${reportData.keyMetrics ? `
          <div class="section">
            <div class="section-title">Key Performance Metrics</div>
            <div class="metric-grid">
              <div class="metric-card">
                <div class="metric-value">${reportData.keyMetrics.liquidityRatio?.toFixed(2) || 'N/A'}</div>
                <div class="metric-label">Liquidity Ratio</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${reportData.keyMetrics.savingsRate?.toFixed(1) || 'N/A'}%</div>
                <div class="metric-label">Savings Rate</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${reportData.keyMetrics.expenseRatio?.toFixed(1) || 'N/A'}%</div>
                <div class="metric-label">Expense Ratio</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${reportData.keyMetrics.transactionVelocity?.toFixed(1) || 'N/A'}</div>
                <div class="metric-label">Daily Transaction Rate</div>
              </div>
            </div>
          </div>
          ` : ''}
          
          ${reportData.highlights ? `
          <div class="section">
            <div class="section-title">Financial Highlights</div>
            ${reportData.highlights.map((highlight: any) => `
              <div class="highlight-card">
                <div class="highlight-title">${highlight.title}</div>
                <div class="highlight-value">${highlight.value}</div>
                <div style="font-size: 14px; opacity: 0.9;">${highlight.description}</div>
              </div>
            `).join('')}
          </div>
          ` : ''}
          
          ${reportData.executiveSummary?.keyFindings ? `
          <div class="section">
            <div class="section-title">Key Findings</div>
            ${reportData.executiveSummary.keyFindings.map((finding: string) => `
              <div style="background: #f8f9fa; padding: 10px; margin-bottom: 8px; border-left: 4px solid #007bff; border-radius: 4px;">
                ${finding}
              </div>
            `).join('')}
          </div>
          ` : ''}
        `;
        
      default:
        return `
          <div class="section">
            <div class="section-title">Summary</div>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Total Transactions</div>
                <div class="summary-value">${reportData.statistics.totalTransactions}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Total Credit</div>
                <div class="summary-value credit">${formatCurrency(reportData.statistics.totalCredit)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Total Debit</div>
                <div class="summary-value debit">${formatCurrency(reportData.statistics.totalDebit)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Net Balance</div>
                <div class="summary-value ${reportData.statistics.balance >= 0 ? 'credit' : 'debit'}">${formatCurrency(reportData.statistics.balance)}</div>
              </div>
            </div>
          </div>
        `;
    }
  };

  const generateChartsHTML = (reportData: any) => {
    // Calculate statistics for charts
    const totalTransactions = reportData.statistics.totalTransactions;
    const creditCount = reportData.statistics.creditTransactions;
    const debitCount = reportData.statistics.debitTransactions;
    const creditPercentage = (creditCount / totalTransactions) * 100;
    const debitPercentage = (debitCount / totalTransactions) * 100;
    
    // Amount distribution data
    const under1k = reportData.transactions.filter((t: Transaction) => t.amount < 1000).length;
    const between1k5k = reportData.transactions.filter((t: Transaction) => t.amount >= 1000 && t.amount < 5000).length;
    const between5k10k = reportData.transactions.filter((t: Transaction) => t.amount >= 5000 && t.amount < 10000).length;
    const above10k = reportData.transactions.filter((t: Transaction) => t.amount >= 10000).length;
    
    // Frequency analysis
    const regularCount = reportData.transactions.filter((t: Transaction) => t.frequency === 'regular').length;
    const irregularCount = reportData.transactions.filter((t: Transaction) => t.frequency === 'irregular').length;
    const regularPercentage = (regularCount / totalTransactions) * 100;
    const irregularPercentage = (irregularCount / totalTransactions) * 100;
    
    // Monthly trend data
    const monthlyData = generateMonthlyData(reportData.transactions);
    const maxMonthlyCount = Math.max(...monthlyData.data);
    
    return `
    <div class="section charts-section" style="page-break-inside: avoid;">
        <div class="section-title">📊 Financial Charts & Visual Analysis</div>
        
        <!-- Credit vs Debit Pie Chart -->
        <div class="chart-container" style="margin-bottom: 30px; page-break-inside: avoid;">
            <div class="chart-title">Credit vs Debit Distribution</div>
            <div style="display: flex; align-items: center; justify-content: center; margin: 20px 0; gap: 30px;">
                <!-- Improved Pie Chart using SVG -->
                <div style="position: relative; width: 200px; height: 200px;">
                    <svg width="200" height="200" viewBox="0 0 200 200" style="transform: rotate(-90deg);">
                        <!-- Credit Slice -->
                        <circle cx="100" cy="100" r="80" fill="none" stroke="#28a745" stroke-width="40"
                                stroke-dasharray="${(creditPercentage / 100) * 502.65} 502.65" 
                                stroke-dashoffset="0" />
                        <!-- Debit Slice -->
                        <circle cx="100" cy="100" r="80" fill="none" stroke="#dc3545" stroke-width="40"
                                stroke-dasharray="${(debitPercentage / 100) * 502.65} 502.65"
                                stroke-dashoffset="${-(creditPercentage / 100) * 502.65}" />
                        <!-- Center Circle -->
                        <circle cx="100" cy="100" r="40" fill="white" stroke="#ddd" stroke-width="2"/>
                    </svg>
                    <!-- Center Text -->
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        text-align: center;
                        font-weight: bold;
                        font-size: 14px;
                    ">
                        ${totalTransactions}<br><span style="font-size: 12px; color: #666;">Total</span>
                    </div>
                </div>
                <!-- Legend -->
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 20px; height: 20px; background: #28a745; border-radius: 3px;"></div>
                        <div>
                            <div style="font-weight: bold; font-size: 16px;">Credit: ${creditCount}</div>
                            <div style="color: #666; font-size: 14px;">${creditPercentage.toFixed(1)}% of transactions</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 20px; height: 20px; background: #dc3545; border-radius: 3px;"></div>
                        <div>
                            <div style="font-weight: bold; font-size: 16px;">Debit: ${debitCount}</div>
                            <div style="color: #666; font-size: 14px;">${debitPercentage.toFixed(1)}% of transactions</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Amount Distribution Bar Chart -->
        <div class="chart-container" style="margin-bottom: 30px; page-break-inside: avoid;">
            <div class="chart-title">Amount Distribution Analysis</div>
            <div style="margin: 20px 0;">
                <!-- Improved Bar Chart with SVG -->
                <svg width="400" height="180" viewBox="0 0 400 180" style="border: 1px solid #ddd; border-radius: 8px; background: #f8f9fa;">
                    <!-- Grid lines -->
                    <defs>
                        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" stroke-width="1"/>
                        </pattern>
                    </defs>
                    <rect width="400" height="150" fill="url(#grid)" opacity="0.3"/>
                    
                    <!-- Bars -->
                    <rect x="50" y="${150 - Math.max((under1k / Math.max(under1k, between1k5k, between5k10k, above10k)) * 120, 5)}" 
                          width="60" height="${Math.max((under1k / Math.max(under1k, between1k5k, between5k10k, above10k)) * 120, 5)}" 
                          fill="url(#grad1)" stroke="#17a2b8" stroke-width="2"/>
                    <rect x="130" y="${150 - Math.max((between1k5k / Math.max(under1k, between1k5k, between5k10k, above10k)) * 120, 5)}" 
                          width="60" height="${Math.max((between1k5k / Math.max(under1k, between1k5k, between5k10k, above10k)) * 120, 5)}" 
                          fill="url(#grad2)" stroke="#28a745" stroke-width="2"/>
                    <rect x="210" y="${150 - Math.max((between5k10k / Math.max(under1k, between1k5k, between5k10k, above10k)) * 120, 5)}" 
                          width="60" height="${Math.max((between5k10k / Math.max(under1k, between1k5k, between5k10k, above10k)) * 120, 5)}" 
                          fill="url(#grad3)" stroke="#ffc107" stroke-width="2"/>
                    <rect x="290" y="${150 - Math.max((above10k / Math.max(under1k, between1k5k, between5k10k, above10k)) * 120, 5)}" 
                          width="60" height="${Math.max((above10k / Math.max(under1k, between1k5k, between5k10k, above10k)) * 120, 5)}" 
                          fill="url(#grad4)" stroke="#dc3545" stroke-width="2"/>
                    
                    <!-- Gradients -->
                    <defs>
                        <linearGradient id="grad1" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" style="stop-color:#17a2b8;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#20c997;stop-opacity:1" />
                        </linearGradient>
                        <linearGradient id="grad2" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" style="stop-color:#28a745;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#20c997;stop-opacity:1" />
                        </linearGradient>
                        <linearGradient id="grad3" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" style="stop-color:#ffc107;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#fd7e14;stop-opacity:1" />
                        </linearGradient>
                        <linearGradient id="grad4" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" style="stop-color:#dc3545;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#e74c3c;stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    
                    <!-- Value labels on bars -->
                    <text x="80" y="${145 - Math.max((under1k / Math.max(under1k, between1k5k, between5k10k, above10k)) * 120, 5)}" 
                          text-anchor="middle" font-size="12" font-weight="bold" fill="#333">${under1k}</text>
                    <text x="160" y="${145 - Math.max((between1k5k / Math.max(under1k, between1k5k, between5k10k, above10k)) * 120, 5)}" 
                          text-anchor="middle" font-size="12" font-weight="bold" fill="#333">${between1k5k}</text>
                    <text x="240" y="${145 - Math.max((between5k10k / Math.max(under1k, between1k5k, between5k10k, above10k)) * 120, 5)}" 
                          text-anchor="middle" font-size="12" font-weight="bold" fill="#333">${between5k10k}</text>
                    <text x="320" y="${145 - Math.max((above10k / Math.max(under1k, between1k5k, between5k10k, above10k)) * 120, 5)}" 
                          text-anchor="middle" font-size="12" font-weight="bold" fill="#333">${above10k}</text>
                    
                    <!-- X-axis labels -->
                    <text x="80" y="170" text-anchor="middle" font-size="11" fill="#666">Under ₹1K</text>
                    <text x="160" y="170" text-anchor="middle" font-size="11" fill="#666">₹1K-5K</text>
                    <text x="240" y="170" text-anchor="middle" font-size="11" fill="#666">₹5K-10K</text>
                    <text x="320" y="170" text-anchor="middle" font-size="11" fill="#666">Above ₹10K</text>
                </svg>
            </div>
        </div>
        
        <!-- Monthly Trend Line Chart -->
        <div class="chart-container" style="margin-bottom: 30px; page-break-inside: avoid;">
            <div class="chart-title">Monthly Transaction Trend</div>
            <div style="margin: 20px 0; position: relative;">
                <!-- Enhanced Line Chart with SVG -->
                <svg width="500" height="200" viewBox="0 0 500 200" style="border: 1px solid #ddd; border-radius: 8px; background: #f8f9fa;">
                    <!-- Grid -->
                    <defs>
                        <pattern id="monthlyGrid" width="25" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 25 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" stroke-width="1"/>
                        </pattern>
                    </defs>
                    <rect width="500" height="160" fill="url(#monthlyGrid)" opacity="0.3"/>
                    
                    <!-- Trend Line -->
                    <polyline points="${monthlyData.labels.map((month: string, index: number) => 
                        `${50 + (index * (400 / Math.max(monthlyData.labels.length - 1, 1)))},${160 - (monthlyData.data[index] / maxMonthlyCount) * 120}`
                    ).join(' ')}" 
                    fill="none" stroke="#007bff" stroke-width="3" stroke-linecap="round"/>
                    
                    <!-- Data Points -->
                    ${monthlyData.labels.map((month: string, index: number) => `
                        <circle cx="${50 + (index * (400 / Math.max(monthlyData.labels.length - 1, 1)))}" 
                                cy="${160 - (monthlyData.data[index] / maxMonthlyCount) * 120}" 
                                r="6" fill="#007bff" stroke="white" stroke-width="2"/>
                        <text x="${50 + (index * (400 / Math.max(monthlyData.labels.length - 1, 1)))}" 
                              y="${150 - (monthlyData.data[index] / maxMonthlyCount) * 120}" 
                              text-anchor="middle" font-size="10" font-weight="bold" fill="#333">${monthlyData.data[index]}</text>
                    `).join('')}
                    
                    <!-- X-axis labels -->
                    ${monthlyData.labels.map((month: string, index: number) => `
                        <text x="${50 + (index * (400 / Math.max(monthlyData.labels.length - 1, 1)))}" 
                              y="185" text-anchor="middle" font-size="10" fill="#666">${month}</text>
                    `).join('')}
                    
                    <!-- Y-axis -->
                    <line x1="40" y1="20" x2="40" y2="160" stroke="#333" stroke-width="2"/>
                    <!-- X-axis -->
                    <line x1="40" y1="160" x2="460" y2="160" stroke="#333" stroke-width="2"/>
                </svg>
                
                <!-- Trend Analysis -->
                <div style="margin-top: 15px; padding: 15px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #007bff;">
                    <div style="font-size: 14px; font-weight: bold; margin-bottom: 5px;">📈 Trend Analysis</div>
                    <div style="font-size: 12px; color: #666;">
                        Peak month: <strong>${monthlyData.labels[monthlyData.data.indexOf(maxMonthlyCount)]}</strong> with <strong>${maxMonthlyCount} transactions</strong>
                        <br>Average monthly transactions: <strong>${(monthlyData.data.reduce((a, b) => a + b, 0) / monthlyData.data.length).toFixed(1)}</strong>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Frequency Analysis -->
        <div class="chart-container" style="margin-bottom: 30px; page-break-inside: avoid;">
            <div class="chart-title">Transaction Frequency Analysis</div>
            <div style="margin: 20px 0;">
                <div style="display: flex; gap: 20px; align-items: center;">
                    <!-- Regular vs Irregular Progress Bars -->
                    <div style="flex: 1;">
                        <div style="margin-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <strong>Regular Transactions</strong>
                                <span>${regularCount} (${regularPercentage.toFixed(1)}%)</span>
                            </div>
                            <div style="background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden;">
                                <div style="
                                    background: linear-gradient(to right, #28a745, #20c997);
                                    height: 100%;
                                    width: ${regularPercentage.toFixed(1)}%;
                                    border-radius: 10px;
                                "></div>
                            </div>
                        </div>
                        <div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <strong>Irregular Transactions</strong>
                                <span>${irregularCount} (${irregularPercentage.toFixed(1)}%)</span>
                            </div>
                            <div style="background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden;">
                                <div style="
                                    background: linear-gradient(to right, #ffc107, #fd7e14);
                                    height: 100%;
                                    width: ${irregularPercentage.toFixed(1)}%;
                                    border-radius: 10px;
                                "></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-radius: 8px; border-left: 4px solid #007bff;">
                    <strong>💡 Financial Insight:</strong> 
                    ${regularCount > irregularCount 
                        ? 'Your spending shows regular patterns, indicating good financial discipline and predictable cash flow management.' 
                        : 'You have more irregular transactions. Consider establishing more structured spending patterns for better financial planning.'}
                </div>
            </div>
        </div>
        
        <!-- Key Metrics Summary -->
        <div class="chart-container" style="page-break-inside: avoid;">
            <div class="chart-title">📈 Key Financial Metrics</div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0;">
                <div style="padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #28a745;">
                    <div style="font-size: 12px; color: #666; margin-bottom: 5px;">AVERAGE TRANSACTION</div>
                    <div style="font-size: 18px; font-weight: bold; color: #28a745;">${formatCurrency(reportData.statistics.averageTransaction)}</div>
                </div>
                <div style="padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
                    <div style="font-size: 12px; color: #666; margin-bottom: 5px;">NET BALANCE</div>
                    <div style="font-size: 18px; font-weight: bold; color: ${reportData.statistics.balance >= 0 ? '#28a745' : '#dc3545'};">${formatCurrency(reportData.statistics.balance)}</div>
                </div>
                <div style="padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #17a2b8;">
                    <div style="font-size: 12px; color: #666; margin-bottom: 5px;">HIGHEST TRANSACTION</div>
                    <div style="font-size: 18px; font-weight: bold; color: #17a2b8;">${formatCurrency(Math.max(...reportData.transactions.map((t: Transaction) => t.amount)))}</div>
                </div>
                <div style="padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #6f42c1;">
                    <div style="font-size: 12px; color: #666; margin-bottom: 5px;">TOTAL TRANSACTIONS</div>
                    <div style="font-size: 18px; font-weight: bold; color: #6f42c1;">${totalTransactions}</div>
                </div>
            </div>
        </div>
    </div>`;
  };

  const generateMonthlyData = (transactions: Transaction[]) => {
    const monthlyMap = new Map();
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
    });
    
    const sortedEntries = Array.from(monthlyMap.entries()).sort();
    return {
      labels: sortedEntries.map(([key]) => key),
      data: sortedEntries.map(([, value]) => value)
    };
  };

  const generateCategoryData = (transactions: Transaction[]) => {
    const categoryMap = new Map();
    
    transactions.forEach(transaction => {
      const category = transaction.type;
      categoryMap.set(category, (categoryMap.get(category) || 0) + transaction.amount);
    });
    
    return Array.from(categoryMap.entries());
  };

  const generateHTMLForPDF = (reportData: any) => {
    const includeCharts = reportData.config?.includeCharts || false;
    const reportType = reportData.reportType || 'transactions';
    
    // Generate chart data if charts are enabled
    const chartHtml = includeCharts ? generateChartsHTML(reportData) : '';
    
    // Generate type-specific content
    const typeSpecificContent = generateTypeSpecificContent(reportData);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${reportData.title || 'Financial Report'}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #333;
            line-height: 1.4;
        }
        .header { 
            text-align: center; 
            border-bottom: 2px solid #007bff; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
        }
        .title { 
            font-size: 24px; 
            font-weight: bold; 
            color: #007bff; 
            margin-bottom: 10px;
        }
        .subtitle { 
            font-size: 14px; 
            color: #666; 
        }
        .section { 
            margin-bottom: 25px; 
        }
        .section-title { 
            font-size: 18px; 
            font-weight: bold; 
            color: #007bff; 
            border-bottom: 1px solid #ddd; 
            padding-bottom: 5px; 
            margin-bottom: 15px;
        }
        .summary-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin-bottom: 20px;
        }
        .summary-item { 
            padding: 10px; 
            background: #f8f9fa; 
            border-radius: 5px;
        }
        .summary-label { 
            font-weight: bold; 
            color: #555;
        }
        .summary-value { 
            font-size: 16px; 
            color: #007bff;
        }
        .insight-item {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 10px;
        }
        .insight-title {
            font-weight: bold;
            color: #856404;
            margin-bottom: 5px;
        }
        .recommendation-item {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 10px;
        }
        .recommendation-title {
            font-weight: bold;
            color: #0c5460;
            margin-bottom: 5px;
        }
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .metric-card {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
            margin-bottom: 5px;
        }
        .metric-label {
            font-size: 12px;
            color: #6c757d;
            text-transform: uppercase;
        }
        .highlight-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 15px;
        }
        .highlight-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .highlight-value {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .transaction-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 15px;
        }
        .transaction-table th, .transaction-table td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left;
            font-size: 12px;
        }
        .transaction-table th { 
            background-color: #007bff; 
            color: white; 
            font-weight: bold;
        }
        .transaction-table tr:nth-child(even) { 
            background-color: #f9f9f9;
        }
        .credit { color: #28a745; font-weight: bold; }
        .debit { color: #dc3545; font-weight: bold; }
        .filter-info { 
            background: #e9ecef; 
            padding: 15px; 
            border-radius: 5px; 
            margin-bottom: 20px;
        }
        .filter-item { 
            margin-bottom: 5px;
        }
        .charts-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        .chart-container {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            border: 1px solid #ddd;
            margin-bottom: 20px;
            page-break-inside: avoid;
        }
        .chart-title {
            font-weight: bold;
            margin-bottom: 15px;
            color: #007bff;
            font-size: 16px;
        }
        
        /* Enhanced print styles */
        @media print {
            body { 
                margin: 0; 
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
            .section { 
                page-break-inside: avoid; 
                margin-bottom: 20px;
            }
            .chart-container {
                page-break-inside: avoid;
                border: 2px solid #333 !important;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
            svg {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
            .charts-section {
                page-break-before: auto;
                page-break-after: auto;
                page-break-inside: avoid;
            }
        }
        
        /* Ensure SVG charts are visible */
        svg {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0 auto;
        }
        @media print {
            body { margin: 0; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">${reportData.title || 'Financial Report'}</div>
        <div class="subtitle">${reportData.subtitle || ''}</div>
        <div class="subtitle">Generated on ${new Date(reportData.generatedAt).toLocaleDateString()}</div>
        <div class="subtitle">User: ${reportData.user?.fullName || 'Unknown'} (${reportData.user?.email || 'Unknown'})</div>
        ${includeCharts ? '<div class="subtitle">📊 Including Charts and Visual Analysis</div>' : ''}
    </div>

    <div class="section">
        <div class="section-title">Applied Filters</div>
        <div class="filter-info">
            <div class="filter-item"><strong>Report Type:</strong> ${reportType.toUpperCase()}</div>
            <div class="filter-item"><strong>Date Range:</strong> ${reportData.filters.dateRange}</div>
            ${reportData.filters.startDate && reportData.filters.endDate ? 
                `<div class="filter-item"><strong>Custom Dates:</strong> ${reportData.filters.startDate} to ${reportData.filters.endDate}</div>` : ''}
            <div class="filter-item"><strong>Transaction Type:</strong> ${reportData.filters.transactionType}</div>
            <div class="filter-item"><strong>Frequency:</strong> ${reportData.filters.frequency}</div>
            ${reportData.filters.searchTerm ? 
                `<div class="filter-item"><strong>Search:</strong> ${reportData.filters.searchTerm}</div>` : ''}
            <div class="filter-item"><strong>Amount Range:</strong> ${reportData.filters.amountRange}</div>
            <div class="filter-item"><strong>Charts Included:</strong> ${includeCharts ? 'Yes' : 'No'}</div>
        </div>
    </div>

    ${typeSpecificContent}
    ${chartHtml}

    ${reportType === 'transactions' || reportType === 'budget' ? `
    <div class="section">
        <div class="section-title">Transaction Details</div>
        <table class="transaction-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Frequency</th>
                    <th>Created</th>
                </tr>
            </thead>
            <tbody>
                ${reportData.transactions.map((transaction: Transaction) => `
                    <tr>
                        <td>${transaction.date}</td>
                        <td>${transaction.description}</td>
                        <td class="${transaction.type}">${formatCurrency(transaction.amount)}</td>
                        <td>${transaction.type.toUpperCase()}</td>
                        <td>${transaction.frequency}</td>
                        <td>${new Date(transaction.created_at).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    <script>
        // Auto-print when ready
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        };
    </script>
</body>
</html>`;
  };

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const updateConfig = (updates: Partial<ReportConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Inter", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid #ffffff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{
            color: '#ffffff',
            fontSize: '18px',
            fontWeight: '500',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>Loading transaction data...</p>
        </div>
      </div>
    );
  }

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
              border: '2px solid rgba(255,255,255,0.2)'
            }}>
              <Download style={{ height: '40px', width: '40px', color: '#667eea' }} />
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
            Download Reports
          </h1>
          <p style={{
            color: '#e2e8f0',
            fontSize: '20px',
            fontWeight: '400',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            Generate and download comprehensive financial reports with advanced filtering
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
            <button
              onClick={() => setActiveTab('generate')}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === 'generate' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'transparent',
                color: activeTab === 'generate' ? '#ffffff' : '#667eea',
                fontWeight: '600',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FileText style={{ height: '18px', width: '18px' }} />
              Generate Report
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === 'recent' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'transparent',
                color: activeTab === 'recent' ? '#ffffff' : '#667eea',
                fontWeight: '600',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <TrendingUp style={{ height: '18px', width: '18px' }} />
              Recent Reports ({recentReports.length})
            </button>
          </div>
        </div>

        {activeTab === 'generate' ? (
        <>
        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth >= 1024 ? '2fr 1fr' : '1fr',
          gap: '32px'
        }}>
          {/* Configuration Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Report Type Selection */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '32px'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1a202c',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <FileText style={{ height: '24px', width: '24px', marginRight: '12px', color: '#667eea' }} />
                Report Type
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: window.innerWidth >= 768 ? 'repeat(2, 1fr)' : '1fr',
                gap: '20px'
              }}>
                {reportTypes.map((report) => (
                  <button
                    key={report.type}
                    onClick={() => updateConfig({ type: report.type })}
                    style={{
                      textAlign: 'left',
                      padding: '24px',
                      borderRadius: '16px',
                      border: config.type === report.type 
                        ? '3px solid #667eea' 
                        : '2px solid rgba(226, 232, 240, 0.8)',
                      background: config.type === report.type
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: config.type === report.type ? 'translateY(-4px)' : 'translateY(0)',
                      boxShadow: config.type === report.type
                        ? '0 20px 40px rgba(102, 126, 234, 0.4)'
                        : '0 8px 25px rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (config.type !== report.type) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (config.type !== report.type) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{
                        padding: '12px',
                        borderRadius: '12px',
                        marginRight: '16px',
                        background: config.type === report.type
                          ? 'rgba(255, 255, 255, 0.2)'
                          : 'rgba(102, 126, 234, 0.1)',
                        color: config.type === report.type ? '#ffffff' : '#667eea'
                      }}>
                        {report.icon}
                      </div>
                      <h4 style={{
                        fontWeight: '700',
                        fontSize: '18px',
                        color: config.type === report.type ? '#ffffff' : '#1a202c'
                      }}>{report.title}</h4>
                    </div>
                    <p style={{
                      fontSize: '14px',
                      color: config.type === report.type ? 'rgba(255, 255, 255, 0.9)' : '#64748b',
                      lineHeight: '1.6'
                    }}>{report.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Format Selection */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '32px'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1a202c',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Download style={{ height: '24px', width: '24px', marginRight: '12px', color: '#667eea' }} />
                Export Format
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {formatOptions.map((format) => (
                  <label
                    key={format.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '20px',
                      borderRadius: '16px',
                      border: config.format === format.value
                        ? '3px solid #667eea'
                        : '2px solid rgba(226, 232, 240, 0.6)',
                      background: config.format === format.value
                        ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
                        : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: config.format === format.value ? 'translateX(8px)' : 'translateX(0)'
                    }}
                    onMouseEnter={(e) => {
                      if (config.format !== format.value) {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (config.format !== format.value) {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }
                    }}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={format.value}
                      checked={config.format === format.value}
                      onChange={(e) => updateConfig({ format: e.target.value as any })}
                      style={{ display: 'none' }}
                    />
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: '3px solid',
                      borderColor: config.format === format.value ? '#667eea' : '#cbd5e0',
                      marginRight: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: config.format === format.value ? '#667eea' : 'transparent',
                      transition: 'all 0.3s ease'
                    }}>
                      {config.format === format.value && (
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#ffffff'
                        }}></div>
                      )}
                    </div>
                    <div>
                      <div style={{
                        fontWeight: '600',
                        fontSize: '18px',
                        color: config.format === format.value ? '#667eea' : '#1a202c',
                        marginBottom: '4px'
                      }}>{format.label}</div>
                      <div style={{
                        fontSize: '14px',
                        color: '#64748b',
                        lineHeight: '1.5'
                      }}>{format.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range Selection */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '32px'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1a202c',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Calendar style={{ height: '24px', width: '24px', marginRight: '12px', color: '#667eea' }} />
                Date Range
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: window.innerWidth >= 768 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                  gap: '12px'
                }}>
                  {dateRangeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateConfig({ dateRange: option.value })}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '16px',
                        fontWeight: '600',
                        fontSize: '16px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: 'none',
                        cursor: 'pointer',
                        outline: 'none',
                        background: config.dateRange === option.value
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                        color: config.dateRange === option.value ? '#ffffff' : '#1a202c',
                        boxShadow: config.dateRange === option.value
                          ? '0 8px 25px rgba(102, 126, 234, 0.4)'
                          : '0 4px 15px rgba(0,0,0,0.1)',
                        transform: config.dateRange === option.value ? 'translateY(-2px)' : 'translateY(0)'
                      }}
                      onMouseEnter={(e) => {
                        if (config.dateRange !== option.value) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (config.dateRange !== option.value) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {config.dateRange === 'custom' && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: window.innerWidth >= 768 ? 'repeat(2, 1fr)' : '1fr',
                    gap: '20px',
                    marginTop: '20px',
                    padding: '24px',
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                    borderRadius: '16px',
                    border: '2px dashed rgba(102, 126, 234, 0.3)'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1a202c',
                        marginBottom: '12px'
                      }}>
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={config.startDate}
                        onChange={(e) => updateConfig({ startDate: e.target.value })}
                        style={{
                          width: '100%',
                          border: '2px solid rgba(226, 232, 240, 0.8)',
                          borderRadius: '12px',
                          padding: '14px 16px',
                          fontSize: '16px',
                          outline: 'none',
                          transition: 'all 0.3s ease',
                          background: '#ffffff',
                          color: '#1a202c'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1a202c',
                        marginBottom: '12px'
                      }}>
                        End Date
                      </label>
                      <input
                        type="date"
                        value={config.endDate}
                        onChange={(e) => updateConfig({ endDate: e.target.value })}
                        style={{
                          width: '100%',
                          border: '2px solid rgba(226, 232, 240, 0.8)',
                          borderRadius: '12px',
                          padding: '14px 16px',
                          fontSize: '16px',
                          outline: 'none',
                          transition: 'all 0.3s ease',
                          background: '#ffffff',
                          color: '#1a202c'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Transaction Filters */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '32px'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1a202c',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Filter style={{ height: '24px', width: '24px', marginRight: '12px', color: '#667eea' }} />
                Transaction Filters
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* Transaction Type Filter */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1a202c',
                    marginBottom: '16px'
                  }}>
                    Transaction Type
                  </label>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'credit', label: 'Credit' },
                      { value: 'debit', label: 'Debit' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateConfig({ transactionType: option.value as any })}
                        style={{
                          padding: '12px 24px',
                          borderRadius: '16px',
                          fontSize: '16px',
                          fontWeight: '600',
                          border: 'none',
                          cursor: 'pointer',
                          outline: 'none',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          background: config.transactionType === option.value
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                          color: config.transactionType === option.value ? '#ffffff' : '#1a202c',
                          boxShadow: config.transactionType === option.value
                            ? '0 8px 25px rgba(102, 126, 234, 0.4)'
                            : '0 4px 15px rgba(0,0,0,0.08)',
                          transform: config.transactionType === option.value ? 'translateY(-2px)' : 'translateY(0)'
                        }}
                        onMouseEnter={(e) => {
                          if (config.transactionType !== option.value) {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (config.transactionType !== option.value) {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frequency Filter */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1a202c',
                    marginBottom: '16px'
                  }}>
                    Frequency
                  </label>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'regular', label: 'Regular' },
                      { value: 'irregular', label: 'Irregular' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateConfig({ frequency: option.value as any })}
                        style={{
                          padding: '12px 24px',
                          borderRadius: '16px',
                          fontSize: '16px',
                          fontWeight: '600',
                          border: 'none',
                          cursor: 'pointer',
                          outline: 'none',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          background: config.frequency === option.value
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                          color: config.frequency === option.value ? '#ffffff' : '#1a202c',
                          boxShadow: config.frequency === option.value
                            ? '0 8px 25px rgba(102, 126, 234, 0.4)'
                            : '0 4px 15px rgba(0,0,0,0.08)',
                          transform: config.frequency === option.value ? 'translateY(-2px)' : 'translateY(0)'
                        }}
                        onMouseEnter={(e) => {
                          if (config.frequency !== option.value) {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (config.frequency !== option.value) {
                            e.currentTarget.style.background = 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Filter */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1a202c',
                    marginBottom: '16px'
                  }}>
                    Search Description
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      height: '20px',
                      width: '20px',
                      color: '#9ca3af'
                    }} />
                    <input
                      type="text"
                      value={config.searchTerm}
                      onChange={(e) => updateConfig({ searchTerm: e.target.value })}
                      placeholder="Search transaction descriptions..."
                      style={{
                        width: '100%',
                        paddingLeft: '50px',
                        paddingRight: '20px',
                        paddingTop: '16px',
                        paddingBottom: '16px',
                        border: '2px solid rgba(226, 232, 240, 0.8)',
                        borderRadius: '16px',
                        fontSize: '16px',
                        outline: 'none',
                        transition: 'all 0.3s ease',
                        background: '#ffffff',
                        color: '#1a202c'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#667eea';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                {/* Amount Range Filter */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#1a202c',
                    marginBottom: '16px'
                  }}>
                    Amount Range
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '16px'
                  }}>
                    <div style={{ position: 'relative' }}>
                      <IndianRupee style={{
                        position: 'absolute',
                        left: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        height: '20px',
                        width: '20px',
                        color: '#9ca3af'
                      }} />
                      <input
                        type="number"
                        value={config.amountMin}
                        onChange={(e) => updateConfig({ amountMin: e.target.value })}
                        placeholder="Min amount"
                        style={{
                          width: '100%',
                          paddingLeft: '50px',
                          paddingRight: '20px',
                          paddingTop: '16px',
                          paddingBottom: '16px',
                          border: '2px solid rgba(226, 232, 240, 0.8)',
                          borderRadius: '16px',
                          fontSize: '16px',
                          outline: 'none',
                          transition: 'all 0.3s ease',
                          background: '#ffffff',
                          color: '#1a202c'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    <div style={{ position: 'relative' }}>
                      <IndianRupee style={{
                        position: 'absolute',
                        left: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        height: '20px',
                        width: '20px',
                        color: '#9ca3af'
                      }} />
                      <input
                        type="number"
                        value={config.amountMax}
                        onChange={(e) => updateConfig({ amountMax: e.target.value })}
                        placeholder="Max amount"
                        style={{
                          width: '100%',
                          paddingLeft: '50px',
                          paddingRight: '20px',
                          paddingTop: '16px',
                          paddingBottom: '16px',
                          border: '2px solid rgba(226, 232, 240, 0.8)',
                          borderRadius: '16px',
                          fontSize: '16px',
                          outline: 'none',
                          transition: 'all 0.3s ease',
                          background: '#ffffff',
                          color: '#1a202c'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Filter Actions */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  paddingTop: '24px',
                  borderTop: '2px solid rgba(226, 232, 240, 0.6)'
                }}>
                  <button
                    onClick={() => setConfig(prev => ({
                      ...prev,
                      transactionType: 'all',
                      frequency: 'all',
                      searchTerm: '',
                      amountMin: '',
                      amountMax: ''
                    }))}
                    style={{
                      padding: '12px 20px',
                      background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                      color: '#1a202c',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: '600',
                      transition: 'all 0.3s ease',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
                    }}
                  >
                    Reset Filters
                  </button>
                  <div style={{
                    fontSize: '16px',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: '500'
                  }}>
                    {filteredTransactions.length} of {transactions.length} transactions
                  </div>
                </div>
              </div>
            </div>

            {/* Report Options */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '32px'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1a202c',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Filter style={{ height: '24px', width: '24px', marginRight: '12px', color: '#667eea' }} />
                Report Options
              </h3>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '20px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                border: '2px solid rgba(102, 126, 234, 0.1)',
                transition: 'all 0.3s ease'
              }}>
                <input
                  type="checkbox"
                  checked={config.includeCharts}
                  onChange={(e) => updateConfig({ includeCharts: e.target.checked })}
                  style={{ display: 'none' }}
                />
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  border: '3px solid',
                  borderColor: config.includeCharts ? '#667eea' : '#cbd5e0',
                  marginRight: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: config.includeCharts ? '#667eea' : 'transparent',
                  transition: 'all 0.3s ease'
                }}>
                  {config.includeCharts && (
                    <svg style={{ width: '14px', height: '14px', color: '#ffffff' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <div style={{
                    fontWeight: '600',
                    fontSize: '18px',
                    color: '#1a202c',
                    marginBottom: '4px'
                  }}>Include Charts and Graphs</div>
                  <div style={{
                    fontSize: '14px',
                    color: '#64748b',
                    lineHeight: '1.5'
                  }}>Add visual representations to your report</div>
                </div>
              </label>
            </div>
          </div>

          {/* Summary Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Report Preview */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '32px'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1a202c',
                marginBottom: '24px'
              }}>Report Preview</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(226, 232, 240, 0.5)'
                }}>
                  <span style={{ color: '#64748b', fontSize: '16px' }}>Type:</span>
                  <span style={{ fontWeight: '600', fontSize: '16px', color: '#1a202c' }}>{reportTypes.find(r => r.type === config.type)?.title}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(226, 232, 240, 0.5)'
                }}>
                  <span style={{ color: '#64748b', fontSize: '16px' }}>Format:</span>
                  <span style={{ fontWeight: '600', fontSize: '16px', color: '#1a202c' }}>{config.format.toUpperCase()}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(226, 232, 240, 0.5)'
                }}>
                  <span style={{ color: '#64748b', fontSize: '16px' }}>Period:</span>
                  <span style={{ fontWeight: '600', fontSize: '16px', color: '#1a202c' }}>
                    {dateRangeOptions.find(d => d.value === config.dateRange)?.label}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(226, 232, 240, 0.5)'
                }}>
                  <span style={{ color: '#64748b', fontSize: '16px' }}>Charts:</span>
                  <span style={{ fontWeight: '600', fontSize: '16px', color: '#1a202c' }}>{config.includeCharts ? 'Included' : 'Excluded'}</span>
                </div>
                <div style={{
                  height: '2px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  margin: '20px 0',
                  borderRadius: '1px'
                }}></div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0'
                }}>
                  <span style={{ color: '#64748b', fontSize: '16px' }}>Transactions:</span>
                  <span style={{ fontWeight: '700', fontSize: '18px', color: '#667eea' }}>{filteredTransactions.length}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0'
                }}>
                  <span style={{ color: '#64748b', fontSize: '16px' }}>Total Credit:</span>
                  <span style={{ fontWeight: '700', fontSize: '18px', color: '#10b981' }}>{formatCurrency(totalCredit)}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0'
                }}>
                  <span style={{ color: '#64748b', fontSize: '16px' }}>Total Debit:</span>
                  <span style={{ fontWeight: '700', fontSize: '18px', color: '#ef4444' }}>{formatCurrency(totalDebit)}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 0',
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                  borderRadius: '12px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  border: '2px solid rgba(102, 126, 234, 0.2)'
                }}>
                  <span style={{ color: '#1a202c', fontSize: '18px', fontWeight: '600' }}>Net Balance:</span>
                  <span style={{
                    fontWeight: '800',
                    fontSize: '20px',
                    color: balance >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    {formatCurrency(balance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || filteredTransactions.length === 0}
              style={{
                width: '100%',
                padding: '20px',
                borderRadius: '20px',
                fontWeight: '700',
                fontSize: '18px',
                border: '3px solid rgba(255, 255, 255, 0.2)',
                cursor: isGenerating || filteredTransactions.length === 0 ? 'not-allowed' : 'pointer',
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                background: isGenerating || filteredTransactions.length === 0
                  ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                  : 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
                color: '#ffffff',
                boxShadow: isGenerating || filteredTransactions.length === 0
                  ? '0 8px 25px rgba(156, 163, 175, 0.3)'
                  : '0 20px 40px rgba(249, 115, 22, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                transform: isGenerating || filteredTransactions.length === 0 ? 'translateY(0)' : 'translateY(-2px)',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
              onMouseEnter={(e) => {
                if (!isGenerating && filteredTransactions.length > 0) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #ea580c 0%, #b91c1c 100%)';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 25px 50px rgba(249, 115, 22, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.border = '3px solid rgba(255, 255, 255, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isGenerating && filteredTransactions.length > 0) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(249, 115, 22, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.border = '3px solid rgba(255, 255, 255, 0.2)';
                }
              }}
            >
              {isGenerating ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    border: '3px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '3px solid #ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginRight: '12px'
                  }}></div>
                  Generating Report...
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText style={{ height: '24px', width: '24px', marginRight: '12px' }} />
                  No Data to Export
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Download style={{ height: '24px', width: '24px', marginRight: '12px' }} />
                  Generate & Download ({filteredTransactions.length} transactions)
                </div>
              )}
            </button>

            {/* Quick Stats */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '32px'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1a202c',
                marginBottom: '24px'
              }}>Current Filter Stats</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(226, 232, 240, 0.5)'
                }}>
                  <span style={{ color: '#64748b', fontSize: '16px' }}>Filtered Transactions</span>
                  <span style={{
                    fontWeight: '700',
                    fontSize: '18px',
                    color: '#667eea',
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                    padding: '6px 12px',
                    borderRadius: '12px'
                  }}>{filteredTransactions.length}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(226, 232, 240, 0.5)'
                }}>
                  <span style={{ color: '#64748b', fontSize: '16px' }}>Credit Transactions</span>
                  <span style={{
                    fontWeight: '700',
                    fontSize: '18px',
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '6px 12px',
                    borderRadius: '12px'
                  }}>{filteredTransactions.filter(t => t.type === 'credit').length}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(226, 232, 240, 0.5)'
                }}>
                  <span style={{ color: '#64748b', fontSize: '16px' }}>Debit Transactions</span>
                  <span style={{
                    fontWeight: '700',
                    fontSize: '18px',
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.1)',
                    padding: '6px 12px',
                    borderRadius: '12px'
                  }}>{filteredTransactions.filter(t => t.type === 'debit').length}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0'
                }}>
                  <span style={{ color: '#64748b', fontSize: '16px' }}>Average Amount</span>
                  <span style={{
                    fontWeight: '700',
                    fontSize: '18px',
                    color: '#1a202c',
                    background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                    padding: '6px 12px',
                    borderRadius: '12px'
                  }}>{formatCurrency(averageTransaction)}</span>
                </div>
                {config.searchTerm && (
                  <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                    borderRadius: '16px',
                    border: '2px solid rgba(102, 126, 234, 0.2)'
                  }}>
                    <span style={{
                      fontSize: '14px',
                      color: '#667eea',
                      fontWeight: '600'
                    }}>Searching for: "{config.searchTerm}"</span>
                  </div>
                )}
                {(config.amountMin || config.amountMax) && (
                  <div style={{
                    marginTop: '12px',
                    padding: '16px',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(34, 197, 94, 0.1) 100%)',
                    borderRadius: '16px',
                    border: '2px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    <span style={{
                      fontSize: '14px',
                      color: '#10b981',
                      fontWeight: '600'
                    }}>
                      Amount: {config.amountMin || '0'} - {config.amountMax || '∞'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Reports */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '32px'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1a202c',
                marginBottom: '24px'
              }}>Recent Reports ({recentReports.length})</h3>
              
              {recentReports.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '32px',
                  color: '#64748b'
                }}>
                  <FileText style={{
                    height: '48px',
                    width: '48px',
                    color: '#cbd5e1',
                    margin: '0 auto 16px'
                  }} />
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>No Recent Reports</div>
                  <div style={{
                    fontSize: '14px'
                  }}>Generate your first report to see it here</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {recentReports.slice(0, 3).map((report, index) => (
                    <div
                      key={report.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 0',
                        borderBottom: index < Math.min(recentReports.length - 1, 2) ? '1px solid rgba(226, 232, 240, 0.5)' : 'none'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#1a202c',
                          marginBottom: '4px'
                        }}>
                          {report.title}
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: '#64748b',
                          marginBottom: '4px'
                        }}>
                          {new Date(report.generatedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })} - {report.dataSnapshot.totalTransactions} transactions
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#94a3b8'
                        }}>
                          {report.type.toUpperCase()} • {report.format.toUpperCase()} • {report.size}
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginLeft: '16px'
                      }}>
                        <button
                          onClick={() => previewReportHandler(report)}
                          style={{
                            color: '#667eea',
                            fontSize: '14px',
                            fontWeight: '600',
                            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)';
                          }}
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => downloadExistingReport(report)}
                          style={{
                            color: '#10b981',
                            fontSize: '14px',
                            fontWeight: '600',
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)';
                          }}
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {recentReports.length > 3 && (
                    <div style={{
                      textAlign: 'center',
                      padding: '16px 0',
                      borderTop: '1px solid rgba(226, 232, 240, 0.5)',
                      marginTop: '8px'
                    }}>
                      <button
                        onClick={() => setActiveTab('recent')}
                        style={{
                          color: '#667eea',
                          fontSize: '14px',
                          fontWeight: '600',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        View All {recentReports.length} Reports →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filtered Transactions Preview - Full Width */}
        {filteredTransactions.length > 0 && (
          <div style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.3)',
            padding: '32px',
            marginTop: '32px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <h3 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#1a202c',
                margin: '0'
              }}>Filtered Transactions Preview</h3>
              <span style={{
                fontSize: '16px',
                color: '#64748b',
                background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                padding: '8px 16px',
                borderRadius: '12px',
                fontWeight: '600'
              }}>
                {filteredTransactions.length} transactions
              </span>
            </div>
            
            <div style={{
              maxHeight: '500px',
              overflowY: 'auto',
              border: '1px solid rgba(226, 232, 240, 0.5)',
              borderRadius: '16px'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 3fr 1fr 1fr 1.5fr',
                gap: '20px',
                padding: '20px 24px',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
                fontSize: '14px',
                fontWeight: '700',
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <div>Date</div>
                <div>Description</div>
                <div>Type</div>
                <div>Frequency</div>
                <div style={{ textAlign: 'right' }}>Amount</div>
              </div>
              
              {filteredTransactions.slice(0, 15).map((transaction, index) => (
                <div
                  key={transaction.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 3fr 1fr 1fr 1.5fr',
                    gap: '20px',
                    padding: '20px 24px',
                    borderBottom: index < Math.min(filteredTransactions.length - 1, 14) ? '1px solid rgba(226, 232, 240, 0.3)' : 'none',
                    background: index % 2 === 0 ? '#ffffff' : 'rgba(248, 250, 252, 0.5)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = index % 2 === 0 ? '#ffffff' : 'rgba(248, 250, 252, 0.5)';
                  }}
                >
                  <div style={{
                    fontSize: '15px',
                    color: '#1a202c',
                    fontWeight: '600'
                  }}>
                    {new Date(transaction.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div style={{
                    fontSize: '15px',
                    color: '#1a202c',
                    fontWeight: '500',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {transaction.description}
                  </div>
                  <div>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      padding: '6px 12px',
                      borderRadius: '10px',
                      background: transaction.type === 'credit' 
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(34, 197, 94, 0.1) 100%)' 
                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                      color: transaction.type === 'credit' ? '#10b981' : '#ef4444',
                      border: `1px solid ${transaction.type === 'credit' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                    }}>
                      {transaction.type.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      padding: '6px 12px',
                      borderRadius: '10px',
                      background: transaction.frequency === 'regular' 
                        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)' 
                        : 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)',
                      color: transaction.frequency === 'regular' ? '#3b82f6' : '#f59e0b',
                      border: `1px solid ${transaction.frequency === 'regular' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                    }}>
                      {transaction.frequency.toUpperCase()}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    textAlign: 'right',
                    color: transaction.type === 'credit' ? '#10b981' : '#ef4444'
                  }}>
                    {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                  </div>
                </div>
              ))}
              
              {filteredTransactions.length > 15 && (
                <div style={{
                  padding: '20px 24px',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderTop: '1px solid rgba(226, 232, 240, 0.5)',
                  color: '#64748b',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  ... and {filteredTransactions.length - 15} more transactions will be included in the report
                </div>
              )}
            </div>
          </div>
        )}
        </>
        ) : (
        <>
        {/* Recent Reports Tab */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.3)',
          padding: '32px'
        }}>
          <h3 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#1a202c',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <TrendingUp style={{ height: '24px', width: '24px', marginRight: '12px', color: '#667eea' }} />
            Recent Reports ({recentReports.length})
          </h3>
          
          {recentReports.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '64px 32px',
              color: '#64748b'
            }}>
              <FileText style={{
                height: '64px',
                width: '64px',
                color: '#cbd5e1',
                margin: '0 auto 24px'
              }} />
              <h4 style={{
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '12px',
                color: '#64748b'
              }}>No Recent Reports</h4>
              <p style={{ fontSize: '16px', lineHeight: '1.6' }}>
                You haven't generated any reports yet. Use the "Generate Report" tab to create your first report.
              </p>
            </div>
          ) : (
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              paddingRight: '8px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentReports.map((report) => (
                  <div 
                    key={report.id} 
                    onClick={() => previewReportHandler(report)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '20px',
                      background: 'linear-gradient(135deg, #f8f9ff 0%, #f1f5f9 100%)',
                      borderRadius: '16px',
                      border: '1px solid rgba(226, 232, 240, 0.6)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #f8f9ff 0%, #f1f5f9 100%)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        <span style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#1a202c',
                          marginRight: '12px'
                        }}>
                          {report.title}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: getTypeColor(report.type),
                          background: `${getTypeColor(report.type)}20`,
                          padding: '4px 8px',
                          borderRadius: '8px',
                          textTransform: 'uppercase'
                        }}>
                          {report.type}
                        </span>
                      </div>
                      <p style={{
                        fontSize: '14px',
                        color: '#64748b',
                        lineHeight: '1.5'
                      }}>
                        Generated on {new Date(report.generatedAt).toLocaleDateString()} at {new Date(report.generatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRecentReport(report.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '18px',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        </>
        )}

        {/* Preview Modal */}
        {showPreview && previewReport && (
          <div style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Preview Header */}
              <div style={{
                padding: '24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#1a202c',
                  margin: '0'
                }}>
                  Report Preview: {previewReport?.title}
                </h3>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewReport(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '24px',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '8px'
                  }}
                >
                  ✕
                </button>
              </div>
              
              {/* Preview Content */}
              <div style={{ 
                flex: 1,
                overflow: 'auto',
                padding: '24px',
                maxHeight: 'calc(90vh - 160px)' // Account for header and footer
              }}>
                <div dangerouslySetInnerHTML={{
                  __html: generateHTMLForPDF(previewReport?.reportData).replace(
                    /<script>[\s\S]*?<\/script>/g, ''
                  ).replace(
                    /window\.onload.*?;/g, ''
                  )
                }} />
              </div>
              
              {/* Preview Actions */}
              <div style={{
                padding: '24px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewReport(null);
                  }}
                  style={{
                    background: '#f8f9fa',
                    color: '#495057',
                    border: '1px solid #dee2e6',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    if (previewReport) {
                      downloadExistingReport(previewReport);
                      setShowPreview(false);
                      setPreviewReport(null);
                    }
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Download style={{ height: '16px', width: '16px' }} />
                  Download
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Add CSS animation for spin */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
      </div>
    </div>
  );
};

export default DownloadReport;