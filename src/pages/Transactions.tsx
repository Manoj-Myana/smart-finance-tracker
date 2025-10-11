import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Calendar, 
  IndianRupee, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Trash2,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Edit
} from 'lucide-react';

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

const Transactions: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'credit' as 'credit' | 'debit',
    frequency: 'regular' as 'regular' | 'irregular'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // New filter states
  const [sortBy, setSortBy] = useState<'none' | 'newest' | 'oldest'>('none');
  const [dateRangeFrom, setDateRangeFrom] = useState('');
  const [dateRangeTo, setDateRangeTo] = useState('');
  const [specificDate, setSpecificDate] = useState('');
  const [amountGreaterThan, setAmountGreaterThan] = useState('');
  const [amountLessThan, setAmountLessThan] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState<'all' | 'regular' | 'irregular'>('all');
  const [dateFilterType, setDateFilterType] = useState<'all' | 'range' | 'specific'>('all');
  
  // Ref for auto-scroll to transaction table
  const transactionTableRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();

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
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  const fetchTransactions = async (userId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      console.log('Fetching transactions for user:', userId);
      console.log('Token for fetch:', token ? 'Present' : 'Missing');
      
      const response = await fetch(`http://localhost:5000/api/transactions/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Fetch response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched transactions:', data);
        setTransactions(data);
      } else {
        console.error('Failed to fetch transactions, status:', response.status);
        const errorData = await response.json();
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount.toString(),
      type: transaction.type,
      frequency: transaction.frequency
    });
    // Scroll to form with smooth behavior
    setTimeout(() => {
      const formElement = document.getElementById('transaction-form');
      if (formElement) {
        formElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      type: 'credit',
      frequency: 'regular'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      
      const requestBody = {
        user_id: user.id,
        date: formData.date,
        description: formData.description,
        amount: parseFloat(formData.amount),
        type: formData.type,
        frequency: formData.frequency
      };

      let response;
      
      if (editingTransaction) {
        // Update existing transaction
        console.log('Updating transaction:', editingTransaction.id, requestBody);
        response = await fetch(`http://localhost:5000/api/transactions/${editingTransaction.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      } else {
        // Create new transaction
        console.log('Creating new transaction:', requestBody);
        response = await fetch('http://localhost:5000/api/transactions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      }

      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (response.ok) {
        // Reset form
        setFormData({
          date: new Date().toISOString().split('T')[0],
          description: '',
          amount: '',
          type: 'credit',
          frequency: 'regular'
        });
        setEditingTransaction(null);
        // Refresh transactions
        fetchTransactions(user.id);
        
        // Auto-scroll to transaction table after adding a new transaction
        if (!editingTransaction && transactionTableRef.current) {
          setTimeout(() => {
            transactionTableRef.current?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }, 100); // Small delay to ensure DOM updates
        }
      } else {
        console.error(`Failed to ${editingTransaction ? 'update' : 'add'} transaction:`, responseData);
        alert(`Failed to ${editingTransaction ? 'update' : 'add'} transaction: ${responseData.message || 'Please try again.'}`);
      }
    } catch (error) {
      console.error(`Error ${editingTransaction ? 'updating' : 'adding'} transaction:`, error);
      alert(`Error ${editingTransaction ? 'updating' : 'adding'} transaction. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok && user) {
        fetchTransactions(user.id);
      } else {
        console.error('Failed to delete transaction');
        alert('Failed to delete transaction. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Error deleting transaction. Please try again.');
    }
  };

  // Bulk selection functions
  const handleSelectTransaction = (transactionId: number) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTransactions.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedTransactions.size} selected transaction(s)?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // Delete transactions one by one (we can optimize this later with a bulk API)
      const deletePromises = Array.from(selectedTransactions).map(transactionId =>
        fetch(`http://localhost:5000/api/transactions/${transactionId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      );

      const results = await Promise.all(deletePromises);
      const failedDeletes = results.filter(response => !response.ok);

      if (failedDeletes.length === 0) {
        // All deletions successful
        setSelectedTransactions(new Set());
        if (user) {
          fetchTransactions(user.id);
        }
        alert(`Successfully deleted ${selectedTransactions.size} transaction(s)`);
      } else {
        alert(`Failed to delete ${failedDeletes.length} transaction(s). Please try again.`);
      }
    } catch (error) {
      console.error('Error during bulk delete:', error);
      alert('Error deleting transactions. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      // Exit selection mode - clear all selections
      setSelectedTransactions(new Set());
    }
  };

  // Format currency consistently in rupees
  const formatCurrency = (amount: number, showSign: boolean = false): string => {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(absAmount);
    
    if (showSign) {
      return amount >= 0 ? `+${formatted}` : `-${formatted}`;
    }
    return formatted;
  };

  // Filter and search transactions with new comprehensive filters
  const filteredTransactions = transactions.filter(transaction => {
    // Basic type filter
    const matchesTypeFilter = filter === 'all' || transaction.type === filter;
    
    // Search filter
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Frequency filter
    const matchesFrequency = frequencyFilter === 'all' || transaction.frequency === frequencyFilter;
    
    // Date filters
    let matchesDateFilter = true;
    if (dateFilterType === 'range' && dateRangeFrom && dateRangeTo) {
      const transactionDate = new Date(transaction.date);
      const fromDate = new Date(dateRangeFrom);
      const toDate = new Date(dateRangeTo);
      matchesDateFilter = transactionDate >= fromDate && transactionDate <= toDate;
    } else if (dateFilterType === 'specific' && specificDate) {
      matchesDateFilter = transaction.date === specificDate;
    }
    
    // Amount filters
    let matchesAmountFilter = true;
    if (amountGreaterThan && transaction.amount <= parseFloat(amountGreaterThan)) {
      matchesAmountFilter = false;
    }
    if (amountLessThan && transaction.amount >= parseFloat(amountLessThan)) {
      matchesAmountFilter = false;
    }
    
    return matchesTypeFilter && matchesSearch && matchesFrequency && matchesDateFilter && matchesAmountFilter;
  }).sort((a, b) => {
    // Apply sorting
    if (sortBy === 'none') return 0; // Keep original order
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
  });

  // Calculate totals for all transactions
  const totalCredit = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalDebit = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalCredit - totalDebit;

  // Calculate totals for filtered transactions
  const filteredTotalCredit = filteredTransactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const filteredTotalDebit = filteredTransactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredBalance = filteredTotalCredit - filteredTotalDebit;

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0, #cbd5e1)',
          backgroundAttachment: 'fixed',
          minHeight: '100vh'
        }}
      >
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-600 rounded-full animate-pulse"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-600 mt-4 font-medium">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0, #cbd5e1)',
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        zIndex: 1
      }}
    >
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Transactions 💰
          </h1>
          <p className="text-gray-700 text-lg font-medium">
            Track and manage all your financial transactions
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Credit */}
          <div 
            className="backdrop-blur-sm rounded-2xl shadow-lg border border-green-100/50 p-6 hover:shadow-xl transition-all"
            style={{
              backgroundColor: 'rgba(240, 253, 244, 0.9)',
              backgroundImage: 'none'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <ArrowUpRight className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                Income
              </span>
            </div>
            <p className="text-gray-700 text-sm font-medium mb-1">Total Credit</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalCredit)}</p>
          </div>

          {/* Total Debit */}
          <div 
            className="backdrop-blur-sm rounded-2xl shadow-lg border border-red-100/50 p-6 hover:shadow-xl transition-all"
            style={{
              backgroundColor: 'rgba(254, 242, 242, 0.9)',
              backgroundImage: 'none'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <ArrowDownRight className="h-6 w-6 text-red-600" />
              </div>
              <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full">
                Expense
              </span>
            </div>
            <p className="text-gray-700 text-sm font-medium mb-1">Total Debit</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalDebit)}</p>
          </div>

          {/* Balance */}
          <div 
            className="backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100/50 p-6 hover:shadow-xl transition-all"
            style={{
              backgroundColor: 'rgba(239, 246, 255, 0.9)',
              backgroundImage: 'none'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <IndianRupee className="h-6 w-6 text-blue-600" />
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                balance >= 0 
                  ? 'text-green-600 bg-green-100' 
                  : 'text-red-600 bg-red-100'
              }`}>
                {balance >= 0 ? 'Positive' : 'Negative'}
              </span>
            </div>
            <p className="text-gray-700 text-sm font-medium mb-1">Net Balance</p>
            <p className={`text-3xl font-bold ${
              balance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(Math.abs(balance))}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Add Transaction Form */}
          <div className="lg:col-span-1" id="transaction-form">
            <div 
              className="backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100/50 p-6"
              style={{
                backgroundColor: 'rgba(250, 245, 255, 0.9)',
                backgroundImage: 'none'
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Plus className="h-7 w-7 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Date */}
                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-3">
                    <Calendar className="h-6 w-6 inline mr-3" />
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-6 py-5 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-3">
                    <FileText className="h-6 w-6 inline mr-3" />
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    placeholder="Enter transaction description..."
                    className="w-full px-6 py-5 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-3">
                    <IndianRupee className="h-6 w-6 inline mr-3" />
                    Amount
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-6 py-5 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Transaction Type */}
                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-3">
                    Transaction Type
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`flex items-center p-5 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.type === 'credit' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-green-300'
                    }`}>
                      <input
                        type="radio"
                        name="type"
                        value="credit"
                        checked={formData.type === 'credit'}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <TrendingUp className="h-7 w-7 text-green-600 mr-4" />
                      <span className="text-lg font-medium text-gray-700">Credit</span>
                    </label>
                    <label className={`flex items-center p-5 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.type === 'debit' 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 hover:border-red-300'
                    }`}>
                      <input
                        type="radio"
                        name="type"
                        value="debit"
                        checked={formData.type === 'debit'}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <TrendingDown className="h-7 w-7 text-red-600 mr-4" />
                      <span className="text-lg font-medium text-gray-700">Debit</span>
                    </label>
                  </div>
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-3">
                    Frequency
                  </label>
                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleInputChange}
                    className="w-full px-6 py-5 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="regular">Regular</option>
                    <option value="irregular">Irregular</option>
                  </select>
                </div>

                {/* Submit Button */}
                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold text-lg px-6 py-5 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                        <span className="text-lg">{editingTransaction ? 'Updating...' : 'Adding...'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Plus className="h-6 w-6 mr-3" />
                        <span className="text-lg">{editingTransaction ? 'Update Transaction' : 'Add Transaction'}</span>
                      </div>
                    )}
                  </button>
                  
                  {editingTransaction && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="w-full text-white font-semibold text-lg px-6 py-5 rounded-xl shadow-lg hover:shadow-xl transition-all"
                      style={{ 
                        backgroundColor: '#ef4444', 
                        backgroundImage: 'none',
                        border: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#dc2626';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ef4444';
                      }}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Transactions List */}
          <div className="lg:col-span-2">
            <div 
              className="backdrop-blur-sm rounded-2xl shadow-lg border border-orange-100/50 p-6"
              style={{
                backgroundColor: 'rgba(255, 247, 237, 0.9)',
                backgroundImage: 'none'
              }}
            >
              <div className="flex flex-col mb-8 gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
                </div>

                {/* Unified Modern Filter Section */}
                <div 
                  className="border border-gray-200 rounded-xl shadow-sm overflow-hidden"
                  style={{ 
                    backgroundColor: '#ffffff', 
                    backgroundImage: 'none' 
                  }}
                >
                  {/* Header */}
                  <div 
                    className="px-4 py-3 border-b border-gray-200"
                    style={{ 
                      backgroundColor: '#f8fafc', 
                      backgroundImage: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-gray-800 flex items-center">
                        <Filter className="h-4 w-4 mr-2 text-gray-600" />
                        Filters & Search
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy('none');
                          setDateRangeFrom('');
                          setDateRangeTo('');
                          setSpecificDate('');
                          setAmountGreaterThan('');
                          setAmountLessThan('');
                          setFrequencyFilter('all');
                          setDateFilterType('all');
                          setFilter('all');
                          setSearchTerm('');
                        }}
                        className="px-3 py-1 text-xs font-medium rounded-md transition-colors hover:shadow-sm"
                        style={{ 
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          backgroundImage: 'none',
                          border: 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#dc2626';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ef4444';
                        }}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                  
                  {/* Main Filter Content - Flexible Column Layout */}
                  <div 
                    className="p-4"
                    style={{ 
                      backgroundColor: '#ffffff', 
                      backgroundImage: 'none' 
                    }}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                      
                      {/* Column 1: Search & Basic Filters */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Search & Type</label>
                          <div className="space-y-2">
                            {/* Search */}
                            <div className="relative">
                              <Search 
                                className="h-4 w-4 absolute text-gray-400 pointer-events-none" 
                                style={{ 
                                  left: '12px', 
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  zIndex: 10
                                }} 
                              />
                              <input
                                type="text"
                                placeholder="Search transactions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                style={{ 
                                  backgroundColor: '#ffffff', 
                                  backgroundImage: 'none',
                                  paddingLeft: '36px'
                                }}
                              />
                            </div>
                            
                            {/* Type & Frequency in same row */}
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                style={{ 
                                  backgroundColor: '#ffffff', 
                                  backgroundImage: 'none' 
                                }}
                              >
                                <option value="all">All Types</option>
                                <option value="credit">Credit</option>
                                <option value="debit">Debit</option>
                              </select>

                              <select
                                value={frequencyFilter}
                                onChange={(e) => setFrequencyFilter(e.target.value as 'all' | 'regular' | 'irregular')}
                                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                style={{ 
                                  backgroundColor: '#ffffff', 
                                  backgroundImage: 'none' 
                                }}
                              >
                                <option value="all">All Freq.</option>
                                <option value="regular">Regular</option>
                                <option value="irregular">Irregular</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Sort Options - Compact Pills */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Sort Order</label>
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => setSortBy('none')}
                              className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                                sortBy === 'none'
                                  ? 'text-white shadow-sm'
                                  : 'text-gray-600 hover:text-gray-800'
                              }`}
                              style={{ 
                                backgroundColor: sortBy === 'none' ? '#f97316' : '#f3f4f6',
                                backgroundImage: 'none'
                              }}
                            >
                              None
                            </button>
                            <button
                              type="button"
                              onClick={() => setSortBy('newest')}
                              className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                                sortBy === 'newest'
                                  ? 'text-white shadow-sm'
                                  : 'text-gray-600 hover:text-gray-800'
                              }`}
                              style={{ 
                                backgroundColor: sortBy === 'newest' ? '#f97316' : '#f3f4f6',
                                backgroundImage: 'none'
                              }}
                            >
                              ↓ Newest
                            </button>
                            <button
                              type="button"
                              onClick={() => setSortBy('oldest')}
                              className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                                sortBy === 'oldest'
                                  ? 'text-white shadow-sm'
                                  : 'text-gray-600 hover:text-gray-800'
                              }`}
                              style={{ 
                                backgroundColor: sortBy === 'oldest' ? '#f97316' : '#f3f4f6',
                                backgroundImage: 'none'
                              }}
                            >
                              ↑ Oldest
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Date Filters */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Date Filters</label>
                          
                          {/* Date Filter Type - Compact Pills */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            <button
                              type="button"
                              onClick={() => setDateFilterType('all')}
                              className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                                dateFilterType === 'all'
                                  ? 'text-white shadow-sm'
                                  : 'text-gray-600 hover:text-gray-800'
                              }`}
                              style={{ 
                                backgroundColor: dateFilterType === 'all' ? '#3b82f6' : '#f3f4f6',
                                backgroundImage: 'none'
                              }}
                            >
                              All
                            </button>
                            <button
                              type="button"
                              onClick={() => setDateFilterType('range')}
                              className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                                dateFilterType === 'range'
                                  ? 'text-white shadow-sm'
                                  : 'text-gray-600 hover:text-gray-800'
                              }`}
                              style={{ 
                                backgroundColor: dateFilterType === 'range' ? '#3b82f6' : '#f3f4f6',
                                backgroundImage: 'none'
                              }}
                            >
                              📅 Range
                            </button>
                            <button
                              type="button"
                              onClick={() => setDateFilterType('specific')}
                              className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                                dateFilterType === 'specific'
                                  ? 'text-white shadow-sm'
                                  : 'text-gray-600 hover:text-gray-800'
                              }`}
                              style={{ 
                                backgroundColor: dateFilterType === 'specific' ? '#3b82f6' : '#f3f4f6',
                                backgroundImage: 'none'
                              }}
                            >
                              📍 Specific
                            </button>
                          </div>

                          {/* Date Inputs - Compact */}
                          {dateFilterType === 'range' && (
                            <div className="space-y-2 animate-fadeIn">
                              <input
                                type="date"
                                value={dateRangeFrom}
                                onChange={(e) => setDateRangeFrom(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                style={{ 
                                  backgroundColor: '#ffffff', 
                                  backgroundImage: 'none' 
                                }}
                                placeholder="From date"
                              />
                              <input
                                type="date"
                                value={dateRangeTo}
                                onChange={(e) => setDateRangeTo(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                style={{ 
                                  backgroundColor: '#ffffff', 
                                  backgroundImage: 'none' 
                                }}
                                placeholder="To date"
                              />
                            </div>
                          )}

                          {dateFilterType === 'specific' && (
                            <div className="animate-fadeIn">
                              <input
                                type="date"
                                value={specificDate}
                                onChange={(e) => setSpecificDate(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                style={{ 
                                  backgroundColor: '#ffffff', 
                                  backgroundImage: 'none' 
                                }}
                                placeholder="Select specific date"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Column 3: Amount Filters */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Amount Range</label>
                          <div className="space-y-2">
                            <div className="relative">
                              <IndianRupee 
                                className="h-4 w-4 absolute text-gray-400 pointer-events-none" 
                                style={{ 
                                  left: '12px', 
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  zIndex: 10
                                }} 
                              />
                              <input
                                type="number"
                                placeholder="Min amount"
                                value={amountGreaterThan}
                                onChange={(e) => setAmountGreaterThan(e.target.value)}
                                step="0.01"
                                min="0"
                                className="w-full pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                style={{ 
                                  backgroundColor: '#ffffff', 
                                  backgroundImage: 'none',
                                  paddingLeft: '36px'
                                }}
                              />
                            </div>
                            <div className="relative">
                              <IndianRupee 
                                className="h-4 w-4 absolute text-gray-400 pointer-events-none" 
                                style={{ 
                                  left: '12px', 
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  zIndex: 10
                                }} 
                              />
                              <input
                                type="number"
                                placeholder="Max amount"
                                value={amountLessThan}
                                onChange={(e) => setAmountLessThan(e.target.value)}
                                step="0.01"
                                min="0"
                                className="w-full pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                style={{ 
                                  backgroundColor: '#ffffff', 
                                  backgroundImage: 'none',
                                  paddingLeft: '36px'
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Filter Status Indicators */}
                        <div className="pt-2">
                          <div className="flex flex-wrap gap-1">
                            {searchTerm && (
                              <span 
                                className="px-2 py-1 text-xs font-medium text-blue-700 rounded-full"
                                style={{ 
                                  backgroundColor: '#dbeafe', 
                                  backgroundImage: 'none' 
                                }}
                              >
                                🔍 Search: "{searchTerm.substring(0, 10)}{searchTerm.length > 10 ? '...' : ''}"
                              </span>
                            )}
                            {filter !== 'all' && (
                              <span 
                                className="px-2 py-1 text-xs font-medium text-orange-700 rounded-full"
                                style={{ 
                                  backgroundColor: '#fed7aa', 
                                  backgroundImage: 'none' 
                                }}
                              >
                                {filter === 'credit' ? '💰 Credit' : '💸 Debit'}
                              </span>
                            )}
                            {frequencyFilter !== 'all' && (
                              <span 
                                className="px-2 py-1 text-xs font-medium text-purple-700 rounded-full"
                                style={{ 
                                  backgroundColor: '#e9d5ff', 
                                  backgroundImage: 'none' 
                                }}
                              >
                                📊 {frequencyFilter}
                              </span>
                            )}
                            {(amountGreaterThan || amountLessThan) && (
                              <span 
                                className="px-2 py-1 text-xs font-medium text-green-700 rounded-full"
                                style={{ 
                                  backgroundColor: '#dcfce7', 
                                  backgroundImage: 'none' 
                                }}
                              >
                                💵 Amount Filter
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>

              {/* Filtered Summary Section */}
              {(searchTerm || filter !== 'all' || frequencyFilter !== 'all' || dateFilterType !== 'all' || amountGreaterThan || amountLessThan || sortBy !== 'none') && (
                <div 
                  style={{
                    marginTop: '20px',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    backgroundColor: 'rgba(239, 246, 255, 0.8)',
                    backgroundImage: 'linear-gradient(135deg, rgba(239, 246, 255, 0.9) 0%, rgba(219, 234, 254, 0.8) 100%)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: '700', 
                      color: '#1f2937',
                      margin: '0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ 
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        📊
                      </span>
                      Filtered Results Summary
                    </h3>
                    <div style={{
                      padding: '4px 12px',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#3b82f6'
                    }}>
                      {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
                    </div>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '16px' 
                  }}>
                    {/* Filtered Total Income */}
                    <div style={{
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      textAlign: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        width: '100%',
                        height: '3px',
                        backgroundColor: '#10b981',
                        backgroundImage: 'linear-gradient(90deg, #10b981, #34d399)'
                      }}></div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          backgroundColor: '#10b981',
                          color: 'white',
                          borderRadius: '8px',
                          padding: '6px',
                          marginRight: '8px'
                        }}>
                          <ArrowUpRight style={{ width: '16px', height: '16px' }} />
                        </div>
                        <span style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#065f46',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Total Income
                        </span>
                      </div>
                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: '800', 
                        color: '#065f46',
                        marginBottom: '4px'
                      }}>
                        {formatCurrency(filteredTotalCredit)}
                      </div>
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#047857',
                        fontWeight: '500'
                      }}>
                        from {filteredTransactions.filter(t => t.type === 'credit').length} credit transaction{filteredTransactions.filter(t => t.type === 'credit').length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Filtered Total Expenditure */}
                    <div style={{
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      textAlign: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        width: '100%',
                        height: '3px',
                        backgroundColor: '#ef4444',
                        backgroundImage: 'linear-gradient(90deg, #ef4444, #f87171)'
                      }}></div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          backgroundColor: '#ef4444',
                          color: 'white',
                          borderRadius: '8px',
                          padding: '6px',
                          marginRight: '8px'
                        }}>
                          <ArrowDownRight style={{ width: '16px', height: '16px' }} />
                        </div>
                        <span style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#7f1d1d',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Total Expenditure
                        </span>
                      </div>
                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: '800', 
                        color: '#7f1d1d',
                        marginBottom: '4px'
                      }}>
                        {formatCurrency(filteredTotalDebit)}
                      </div>
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#991b1b',
                        fontWeight: '500'
                      }}>
                        from {filteredTransactions.filter(t => t.type === 'debit').length} debit transaction{filteredTransactions.filter(t => t.type === 'debit').length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Filtered Net Balance */}
                    <div style={{
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: filteredBalance >= 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      border: `1px solid ${filteredBalance >= 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                      textAlign: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        width: '100%',
                        height: '3px',
                        backgroundColor: filteredBalance >= 0 ? '#3b82f6' : '#f59e0b',
                        backgroundImage: filteredBalance >= 0 
                          ? 'linear-gradient(90deg, #3b82f6, #60a5fa)' 
                          : 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                      }}></div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          backgroundColor: filteredBalance >= 0 ? '#3b82f6' : '#f59e0b',
                          color: 'white',
                          borderRadius: '8px',
                          padding: '6px',
                          marginRight: '8px'
                        }}>
                          <IndianRupee style={{ width: '16px', height: '16px' }} />
                        </div>
                        <span style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: filteredBalance >= 0 ? '#1e3a8a' : '#92400e',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Net Balance
                        </span>
                      </div>
                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: '800', 
                        color: filteredBalance >= 0 ? '#1e3a8a' : '#92400e',
                        marginBottom: '4px'
                      }}>
                        {formatCurrency(Math.abs(filteredBalance))}
                      </div>
                      <div style={{ 
                        fontSize: '11px', 
                        color: filteredBalance >= 0 ? '#1e40af' : '#b45309',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}>
                        <span style={{
                          backgroundColor: filteredBalance >= 0 ? '#22c55e' : '#ef4444',
                          color: 'white',
                          borderRadius: '50%',
                          width: '12px',
                          height: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '8px'
                        }}>
                          {filteredBalance >= 0 ? '↗' : '↘'}
                        </span>
                        {filteredBalance >= 0 ? 'Positive' : 'Negative'} balance
                      </div>
                    </div>

                    {/* Savings Rate */}
                    <div style={{
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(139, 69, 193, 0.1)',
                      border: '1px solid rgba(139, 69, 193, 0.2)',
                      textAlign: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        width: '100%',
                        height: '3px',
                        backgroundColor: '#8b5cf6',
                        backgroundImage: 'linear-gradient(90deg, #8b5cf6, #a78bfa)'
                      }}></div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          backgroundColor: '#8b5cf6',
                          color: 'white',
                          borderRadius: '8px',
                          padding: '6px',
                          marginRight: '8px'
                        }}>
                          📈
                        </div>
                        <span style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#581c87',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Savings Rate
                        </span>
                      </div>
                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: '800', 
                        color: '#581c87',
                        marginBottom: '4px'
                      }}>
                        {filteredTotalCredit > 0 ? ((filteredBalance / filteredTotalCredit) * 100).toFixed(1) : '0.0'}%
                      </div>
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#6b21a8',
                        fontWeight: '500'
                      }}>
                        {filteredBalance >= 0 ? 'saving money' : 'spending more than earning'}
                      </div>
                    </div>
                  </div>

                  {/* Additional Insights */}
                  {filteredTransactions.length > 0 && (
                    <div style={{
                      marginTop: '16px',
                      padding: '12px 16px',
                      backgroundColor: 'rgba(255, 255, 255, 0.6)',
                      borderRadius: '10px',
                      border: '1px solid rgba(59, 130, 246, 0.1)',
                      fontSize: '12px',
                      color: '#4b5563',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span>📅 Showing results for your current filter selection</span>
                        <span>•</span>
                        <span>💡 Average transaction: {formatCurrency(filteredTransactions.length > 0 ? (filteredTotalCredit + filteredTotalDebit) / filteredTransactions.length : 0)}</span>
                      </div>
                      <button
                        onClick={() => {
                          setSortBy('none');
                          setDateRangeFrom('');
                          setDateRangeTo('');
                          setSpecificDate('');
                          setAmountGreaterThan('');
                          setAmountLessThan('');
                          setFrequencyFilter('all');
                          setDateFilterType('all');
                          setFilter('all');
                          setSearchTerm('');
                        }}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '500',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        }}
                      >
                        🔄 Reset Filters
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Transactions Table */}
              <div 
                ref={transactionTableRef}
                style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid #f3f4f6',
                overflow: 'hidden'
              }}>
                {/* Table Controls */}
                <div style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#1f2937',
                    margin: 0
                  }}>
                    Transactions ({filteredTransactions.length})
                  </h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {!isSelectionMode ? (
                      <button
                        onClick={toggleSelectionMode}
                        style={{
                          padding: '10px 16px',
                          backgroundColor: '#3b82f6',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease-in-out'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#2563eb';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = '#3b82f6';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        Select Multiple
                      </button>
                    ) : (
                      <button
                        onClick={toggleSelectionMode}
                        style={{
                          padding: '10px 16px',
                          backgroundColor: '#6b7280',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease-in-out'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#4b5563';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = '#6b7280';
                        }}
                      >
                        Cancel Selection
                      </button>
                    )}
                  </div>
                </div>
                {filteredTransactions.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    paddingTop: '64px',
                    paddingBottom: '64px'
                  }}>
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '50%',
                      width: '80px',
                      height: '80px',
                      margin: '0 auto 24px auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FileText style={{ height: '48px', width: '48px', color: '#9ca3af' }} />
                    </div>
                    <p style={{
                      color: '#4b5563',
                      fontSize: '20px',
                      fontWeight: '500',
                      marginBottom: '8px'
                    }}>No transactions found</p>
                    <p style={{
                      color: '#9ca3af',
                      fontSize: '16px'
                    }}>
                      {transactions.length === 0 
                        ? "Add your first transaction to get started!" 
                        : "Try adjusting your search or filter criteria."}
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    {/* Bulk Actions */}
                    {isSelectionMode && selectedTransactions.size > 0 && (
                      <div style={{
                        padding: '16px 24px',
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #0ea5e9',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <span style={{
                            color: '#0c4a6e',
                            fontWeight: '600',
                            fontSize: '16px'
                          }}>
                            {selectedTransactions.size} transaction{selectedTransactions.size !== 1 ? 's' : ''} selected
                          </span>
                          <button
                            onClick={() => setSelectedTransactions(new Set())}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: 'transparent',
                              border: '1px solid #0ea5e9',
                              borderRadius: '6px',
                              color: '#0ea5e9',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              transition: 'all 0.2s ease-in-out'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = '#0ea5e9';
                              e.currentTarget.style.color = 'white';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = '#0ea5e9';
                            }}
                          >
                            Clear Selection
                          </button>
                        </div>
                        <button
                          onClick={handleBulkDelete}
                          disabled={isDeleting}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: isDeleting ? '#9ca3af' : '#ef4444',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                            fontSize: '16px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease-in-out'
                          }}
                          onMouseOver={(e) => {
                            if (!isDeleting) {
                              e.currentTarget.style.backgroundColor = '#dc2626';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (!isDeleting) {
                              e.currentTarget.style.backgroundColor = '#ef4444';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }
                          }}
                        >
                          <Trash2 style={{ height: '16px', width: '16px' }} />
                          {isDeleting ? 'Deleting...' : `Delete Selected (${selectedTransactions.size})`}
                        </button>
                      </div>
                    )}
                    <table style={{
                      width: '100%',
                      borderCollapse: 'separate',
                      borderSpacing: '0'
                    }}>
                      <thead style={{
                        backgroundColor: '#f9fafb',
                        borderBottom: '2px solid #e5e7eb'
                      }}>
                        <tr>
                          {isSelectionMode && (
                            <th style={{
                              textAlign: 'center',
                              paddingTop: '20px',
                              paddingBottom: '20px',
                              paddingLeft: '24px',
                              paddingRight: '24px',
                              fontWeight: 'bold',
                              color: '#1f2937',
                              fontSize: '18px',
                              borderRight: '1px solid #f3f4f6',
                              width: '60px'
                            }}>
                              <input
                                type="checkbox"
                                checked={selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0}
                                onChange={handleSelectAll}
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer',
                                  accentColor: '#3b82f6'
                                }}
                              />
                            </th>
                          )}
                          <th style={{
                            textAlign: 'left',
                            paddingTop: '20px',
                            paddingBottom: '20px',
                            paddingLeft: '24px',
                            paddingRight: '24px',
                            fontWeight: 'bold',
                            color: '#1f2937',
                            fontSize: '18px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            borderRight: '1px solid #f3f4f6'
                          }}>Date</th>
                          <th style={{
                            textAlign: 'left',
                            paddingTop: '20px',
                            paddingBottom: '20px',
                            paddingLeft: '24px',
                            paddingRight: '24px',
                            fontWeight: 'bold',
                            color: '#1f2937',
                            fontSize: '18px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            borderRight: '1px solid #f3f4f6'
                          }}>Description</th>
                          <th style={{
                            textAlign: 'left',
                            paddingTop: '20px',
                            paddingBottom: '20px',
                            paddingLeft: '24px',
                            paddingRight: '24px',
                            fontWeight: 'bold',
                            color: '#1f2937',
                            fontSize: '18px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            borderRight: '1px solid #f3f4f6'
                          }}>Type</th>
                          <th style={{
                            textAlign: 'left',
                            paddingTop: '20px',
                            paddingBottom: '20px',
                            paddingLeft: '24px',
                            paddingRight: '24px',
                            fontWeight: 'bold',
                            color: '#1f2937',
                            fontSize: '18px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            borderRight: '1px solid #f3f4f6'
                          }}>Frequency</th>
                          <th style={{
                            textAlign: 'right',
                            paddingTop: '20px',
                            paddingBottom: '20px',
                            paddingLeft: '24px',
                            paddingRight: '24px',
                            fontWeight: 'bold',
                            color: '#1f2937',
                            fontSize: '18px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            borderRight: '1px solid #f3f4f6'
                          }}>Amount</th>
                          <th style={{
                            textAlign: 'center',
                            paddingTop: '20px',
                            paddingBottom: '20px',
                            paddingLeft: '24px',
                            paddingRight: '24px',
                            fontWeight: 'bold',
                            color: '#1f2937',
                            fontSize: '18px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em'
                          }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((transaction, index) => {
                          const baseRowStyle = {
                            backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
                            borderBottom: '1px solid #f3f4f6',
                            transition: 'all 0.2s ease-in-out'
                          };

                          const hoverStyle = {
                            ...baseRowStyle,
                            backgroundColor: '#f3f4f6',
                            transform: 'translateX(2px)',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                          };

                          return (
                            <tr 
                              key={transaction.id}
                              style={baseRowStyle}
                              onMouseEnter={(e) => Object.assign(e.currentTarget.style, hoverStyle)}
                              onMouseLeave={(e) => Object.assign(e.currentTarget.style, baseRowStyle)}
                            >
                              {isSelectionMode && (
                                <td style={{
                                  textAlign: 'center',
                                  paddingTop: '24px',
                                  paddingBottom: '24px',
                                  paddingLeft: '24px',
                                  paddingRight: '24px',
                                  borderRight: '1px solid #f3f4f6'
                                }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedTransactions.has(transaction.id)}
                                    onChange={() => handleSelectTransaction(transaction.id)}
                                    style={{
                                      width: '18px',
                                      height: '18px',
                                      cursor: 'pointer',
                                      accentColor: '#3b82f6'
                                    }}
                                  />
                                </td>
                              )}
                              <td style={{
                                paddingTop: '24px',
                                paddingBottom: '24px',
                                paddingLeft: '24px',
                                paddingRight: '24px',
                                fontSize: '16px',
                                color: '#4b5563',
                                fontWeight: '500',
                                borderRight: '1px solid #f3f4f6'
                              }}>
                                {new Date(transaction.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </td>
                              <td style={{
                                paddingTop: '24px',
                                paddingBottom: '24px',
                                paddingLeft: '24px',
                                paddingRight: '24px',
                                borderRight: '1px solid #f3f4f6'
                              }}>
                                <div style={{ maxWidth: '300px' }}>
                                  <p style={{
                                    fontSize: '18px',
                                    fontWeight: '500',
                                    color: '#111827',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    margin: '0'
                                  }}>
                                    {transaction.description}
                                  </p>
                                </div>
                              </td>
                              <td style={{
                                paddingTop: '24px',
                                paddingBottom: '24px',
                                paddingLeft: '24px',
                                paddingRight: '24px',
                                borderRight: '1px solid #f3f4f6'
                              }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '8px 16px',
                                  borderRadius: '9999px',
                                  fontSize: '16px',
                                  fontWeight: '500',
                                  backgroundColor: transaction.type === 'credit' ? '#dcfce7' : '#fee2e2',
                                  color: transaction.type === 'credit' ? '#15803d' : '#dc2626',
                                  border: transaction.type === 'credit' ? '1px solid #bbf7d0' : '1px solid #fecaca'
                                }}>
                                  {transaction.type === 'credit' ? (
                                    <TrendingUp style={{ height: '20px', width: '20px', marginRight: '8px' }} />
                                  ) : (
                                    <TrendingDown style={{ height: '20px', width: '20px', marginRight: '8px' }} />
                                  )}
                                  {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                                </span>
                              </td>
                              <td style={{
                                paddingTop: '24px',
                                paddingBottom: '24px',
                                paddingLeft: '24px',
                                paddingRight: '24px',
                                borderRight: '1px solid #f3f4f6'
                              }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '8px 16px',
                                  borderRadius: '9999px',
                                  fontSize: '16px',
                                  fontWeight: '500',
                                  backgroundColor: transaction.frequency === 'regular' ? '#dbeafe' : '#fef3c7',
                                  color: transaction.frequency === 'regular' ? '#1d4ed8' : '#d97706',
                                  border: transaction.frequency === 'regular' ? '1px solid #c7d2fe' : '1px solid #fed7aa'
                                }}>
                                  {transaction.frequency.charAt(0).toUpperCase() + transaction.frequency.slice(1)}
                                </span>
                              </td>
                              <td style={{
                                paddingTop: '24px',
                                paddingBottom: '24px',
                                paddingLeft: '24px',
                                paddingRight: '24px',
                                textAlign: 'right',
                                fontWeight: 'bold',
                                fontSize: '18px',
                                color: transaction.type === 'credit' ? '#059669' : '#dc2626',
                                borderRight: '1px solid #f3f4f6'
                              }}>
                                {formatCurrency(transaction.type === 'credit' ? transaction.amount : -transaction.amount, true)}
                              </td>
                              <td style={{
                                paddingTop: '24px',
                                paddingBottom: '24px',
                                paddingLeft: '24px',
                                paddingRight: '24px',
                                textAlign: 'center'
                              }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px'
                                }}>
                                  <button
                                    onClick={() => handleEditTransaction(transaction)}
                                    style={{
                                      backgroundColor: '#3b82f6',
                                      color: 'white',
                                      padding: '8px 16px',
                                      borderRadius: '8px',
                                      fontSize: '14px',
                                      fontWeight: '600',
                                      border: 'none',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#2563eb';
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = '#3b82f6';
                                      e.currentTarget.style.transform = 'translateY(0)';
                                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                                    }}
                                  >
                                    <Edit style={{ height: '16px', width: '16px' }} />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTransaction(transaction.id)}
                                    style={{
                                      backgroundColor: '#ef4444',
                                      color: 'white',
                                      padding: '8px 16px',
                                      borderRadius: '8px',
                                      fontSize: '14px',
                                      fontWeight: '600',
                                      border: 'none',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#dc2626';
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = '#ef4444';
                                      e.currentTarget.style.transform = 'translateY(0)';
                                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.2)';
                                    }}
                                  >
                                    <Trash2 style={{ height: '16px', width: '16px' }} />
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Transactions;