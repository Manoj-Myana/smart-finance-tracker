import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar, Filter, TrendingUp, PieChart, BarChart, Search, IndianRupee } from 'lucide-react';

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

const DownloadReport: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
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
      // Prepare report data
      const reportData = {
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
        generatedAt: new Date().toISOString()
      };

      // Simulate API call for report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, you would call your backend API here
      console.log('Generating report with data:', reportData);
      
      // Create a downloadable file based on format
      await downloadReport(reportData);
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = async (reportData: any) => {
    const baseFileName = `${config.type}_report_${new Date().toISOString().split('T')[0]}`;
    
    if (config.format === 'csv') {
      // Generate CSV
      const csvContent = generateCSV(reportData.transactions);
      downloadFile(csvContent, `${baseFileName}.csv`, 'text/csv');
    } else if (config.format === 'excel') {
      // Generate Excel-compatible CSV with enhanced formatting
      const excelContent = generateExcelCSV(reportData);
      downloadFile(excelContent, `${baseFileName}.xls`, 'application/vnd.ms-excel');
    } else if (config.format === 'pdf') {
      // Generate HTML content that can be converted to PDF
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

  const generateCSV = (transactions: Transaction[]) => {
    const headers = ['Date', 'Description', 'Amount', 'Type', 'Frequency', 'Created At'];
    const csvRows = [headers.join(',')];
    
    transactions.forEach(transaction => {
      const row = [
        transaction.date,
        `"${transaction.description}"`,
        transaction.amount,
        transaction.type,
        transaction.frequency,
        transaction.created_at
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  };

  const generateExcelCSV = (reportData: any) => {
    const lines = [];
    lines.push('FINANCIAL REPORT');
    lines.push(`Generated on: ${new Date(reportData.generatedAt).toLocaleDateString()}`);
    lines.push(`User: ${reportData.user?.fullName || 'Unknown'}`);
    lines.push('');
    
    // Summary
    lines.push('SUMMARY');
    lines.push(`Total Transactions,${reportData.statistics.totalTransactions}`);
    lines.push(`Total Credit,${reportData.statistics.totalCredit}`);
    lines.push(`Total Debit,${reportData.statistics.totalDebit}`);
    lines.push(`Balance,${reportData.statistics.balance}`);
    lines.push(`Average Transaction,${reportData.statistics.averageTransaction.toFixed(2)}`);
    lines.push('');
    
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

  const generateHTMLForPDF = (reportData: any) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Financial Report</title>
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
        @media print {
            body { margin: 0; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">Financial Report</div>
        <div class="subtitle">Generated on ${new Date(reportData.generatedAt).toLocaleDateString()}</div>
        <div class="subtitle">User: ${reportData.user?.fullName || 'Unknown'} (${reportData.user?.email || 'Unknown'})</div>
    </div>

    <div class="section">
        <div class="section-title">Applied Filters</div>
        <div class="filter-info">
            <div class="filter-item"><strong>Date Range:</strong> ${reportData.filters.dateRange}</div>
            ${reportData.filters.startDate && reportData.filters.endDate ? 
                `<div class="filter-item"><strong>Custom Dates:</strong> ${reportData.filters.startDate} to ${reportData.filters.endDate}</div>` : ''}
            <div class="filter-item"><strong>Transaction Type:</strong> ${reportData.filters.transactionType}</div>
            <div class="filter-item"><strong>Frequency:</strong> ${reportData.filters.frequency}</div>
            ${reportData.filters.searchTerm ? 
                `<div class="filter-item"><strong>Search:</strong> ${reportData.filters.searchTerm}</div>` : ''}
            <div class="filter-item"><strong>Amount Range:</strong> ${reportData.filters.amountRange}</div>
        </div>
    </div>

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transaction data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
              <Download className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Download Reports
          </h1>
          <p className="text-gray-600 mt-2">
            Generate and download comprehensive financial reports
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Report Type Selection */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Report Type
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reportTypes.map((report) => (
                  <button
                    key={report.type}
                    onClick={() => updateConfig({ type: report.type })}
                    className={`text-left p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                      config.type === report.type
                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                        : 'border-gray-200 bg-white/50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <div className={`p-2 rounded-lg mr-3 ${
                        config.type === report.type
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {report.icon}
                      </div>
                      <h4 className="font-semibold text-gray-800">{report.title}</h4>
                    </div>
                    <p className="text-sm text-gray-600">{report.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Format Selection */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Download className="h-5 w-5 mr-2" />
                Export Format
              </h3>
              <div className="space-y-3">
                {formatOptions.map((format) => (
                  <label
                    key={format.value}
                    className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all hover:bg-gray-50 ${
                      config.format === format.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={format.value}
                      checked={config.format === format.value}
                      onChange={(e) => updateConfig({ format: e.target.value as any })}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                      config.format === format.value
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-400'
                    }`}>
                      {config.format === format.value && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{format.label}</div>
                      <div className="text-sm text-gray-600">{format.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Range Selection */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Date Range
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {dateRangeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateConfig({ dateRange: option.value })}
                      className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                        config.dateRange === option.value
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {config.dateRange === 'custom' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={config.startDate}
                        onChange={(e) => updateConfig({ startDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={config.endDate}
                        onChange={(e) => updateConfig({ endDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Options */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Transaction Filters
              </h3>
              
              <div className="space-y-4">
                {/* Transaction Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction Type
                  </label>
                  <div className="flex space-x-2">
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'credit', label: 'Credit' },
                      { value: 'debit', label: 'Debit' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateConfig({ transactionType: option.value as any })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          config.transactionType === option.value
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frequency Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency
                  </label>
                  <div className="flex space-x-2">
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'regular', label: 'Regular' },
                      { value: 'irregular', label: 'Irregular' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => updateConfig({ frequency: option.value as any })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          config.frequency === option.value
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Description
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={config.searchTerm}
                      onChange={(e) => updateConfig({ searchTerm: e.target.value })}
                      placeholder="Search transaction descriptions..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Amount Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount Range
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        value={config.amountMin}
                        onChange={(e) => updateConfig({ amountMin: e.target.value })}
                        placeholder="Min amount"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        value={config.amountMax}
                        onChange={(e) => updateConfig({ amountMax: e.target.value })}
                        placeholder="Max amount"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setConfig(prev => ({
                      ...prev,
                      transactionType: 'all',
                      frequency: 'all',
                      searchTerm: '',
                      amountMin: '',
                      amountMax: ''
                    }))}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-sm"
                  >
                    Reset Filters
                  </button>
                  <div className="text-sm text-gray-500 flex items-center">
                    {filteredTransactions.length} of {transactions.length} transactions
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Options */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Report Options
              </h3>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeCharts}
                  onChange={(e) => updateConfig({ includeCharts: e.target.checked })}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                  config.includeCharts
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-400'
                }`}>
                  {config.includeCharts && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-800">Include Charts and Graphs</div>
                  <div className="text-sm text-gray-600">Add visual representations to your report</div>
                </div>
              </label>
            </div>
          </div>

          {/* Summary Panel */}
          <div className="space-y-6">
            {/* Report Preview */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Report Preview</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">{reportTypes.find(r => r.type === config.type)?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Format:</span>
                  <span className="font-medium">{config.format.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Period:</span>
                  <span className="font-medium">
                    {dateRangeOptions.find(d => d.value === config.dateRange)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Charts:</span>
                  <span className="font-medium">{config.includeCharts ? 'Included' : 'Excluded'}</span>
                </div>
                <hr className="my-3" />
                <div className="flex justify-between">
                  <span className="text-gray-600">Transactions:</span>
                  <span className="font-medium">{filteredTransactions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Credit:</span>
                  <span className="font-medium text-green-600">{formatCurrency(totalCredit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Debit:</span>
                  <span className="font-medium text-red-600">{formatCurrency(totalDebit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Net Balance:</span>
                  <span className={`font-medium ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(balance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || filteredTransactions.length === 0}
              className={`w-full py-4 rounded-xl font-semibold transition-all transform shadow-lg ${
                isGenerating || filteredTransactions.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105'
              } text-white`}
            >
              {isGenerating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Generating Report...
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="flex items-center justify-center">
                  <FileText className="h-5 w-5 mr-2" />
                  No Data to Export
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Download className="h-5 w-5 mr-2" />
                  Generate & Download ({filteredTransactions.length} transactions)
                </div>
              )}
            </button>

            {/* Quick Stats */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Filter Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Filtered Transactions</span>
                  <span className="font-semibold text-gray-800">{filteredTransactions.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Credit Transactions</span>
                  <span className="font-semibold text-green-600">{filteredTransactions.filter(t => t.type === 'credit').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Debit Transactions</span>
                  <span className="font-semibold text-red-600">{filteredTransactions.filter(t => t.type === 'debit').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Average Amount</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(averageTransaction)}</span>
                </div>
                {config.searchTerm && (
                  <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                    <span className="text-xs text-blue-600">Searching for: "{config.searchTerm}"</span>
                  </div>
                )}
                {(config.amountMin || config.amountMax) && (
                  <div className="mt-2 p-2 bg-green-50 rounded-lg">
                    <span className="text-xs text-green-600">
                      Amount: {config.amountMin || '0'} - {config.amountMax || '∞'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Reports */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Reports</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <div className="text-sm font-medium">Transaction Report</div>
                    <div className="text-xs text-gray-500">Yesterday - 142 transactions</div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    Download
                  </button>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <div className="text-sm font-medium">Monthly Summary</div>
                    <div className="text-xs text-gray-500">1 week ago - Full month</div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    Download
                  </button>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium">Budget Analysis</div>
                    <div className="text-xs text-gray-500">2 weeks ago - Q3 data</div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Preview */}
        {filteredTransactions.length > 0 && (
          <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Transaction Preview ({filteredTransactions.length} transactions)
            </h3>
            <div className="max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {filteredTransactions.slice(0, 10).map((transaction, index) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{transaction.description}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(transaction.date).toLocaleDateString()} • {transaction.frequency}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${
                        transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </div>
                      <div className="text-xs text-gray-500 uppercase">{transaction.type}</div>
                    </div>
                  </div>
                ))}
                {filteredTransactions.length > 10 && (
                  <div className="text-center py-2 text-gray-500 text-sm">
                    ... and {filteredTransactions.length - 10} more transactions
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {filteredTransactions.length === 0 && !loading && (
          <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 p-12 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Transactions Found</h3>
            <p className="text-gray-500">
              No transactions match your current filter criteria. Try adjusting your filters or date range.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadReport;