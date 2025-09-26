import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Calendar, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Trash2,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      console.log('Submitting transaction:', formData);
      console.log('User:', user);
      console.log('Token:', token ? 'Present' : 'Missing');
      
      const requestBody = {
        user_id: user.id,
        date: formData.date,
        description: formData.description,
        amount: parseFloat(formData.amount),
        type: formData.type,
        frequency: formData.frequency
      };
      
      console.log('Request body:', requestBody);
      
      const response = await fetch('http://localhost:5000/api/transactions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

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
        // Refresh transactions
        fetchTransactions(user.id);
      } else {
        console.error('Failed to add transaction:', responseData);
        alert(`Failed to add transaction: ${responseData.message || 'Please try again.'}`);
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Error adding transaction. Please try again.');
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

  // Filter and search transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesFilter = filter === 'all' || transaction.type === filter;
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Calculate totals
  const totalCredit = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalDebit = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalCredit - totalDebit;

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
            <p className="text-3xl font-bold text-gray-900">${totalCredit.toFixed(2)}</p>
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
            <p className="text-3xl font-bold text-gray-900">${totalDebit.toFixed(2)}</p>
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
                <DollarSign className="h-6 w-6 text-blue-600" />
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
              ${Math.abs(balance).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Transaction Form */}
          <div className="lg:col-span-1">
            <div 
              className="backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100/50 p-6"
              style={{
                backgroundColor: 'rgba(250, 245, 255, 0.9)',
                backgroundImage: 'none'
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Plus className="h-6 w-6 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Add Transaction</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="h-4 w-4 inline mr-2" />
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    placeholder="Enter transaction description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="h-4 w-4 inline mr-2" />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Transaction Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
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
                      <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Credit</span>
                    </label>
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
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
                      <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Debit</span>
                    </label>
                  </div>
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequency
                  </label>
                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="regular">Regular</option>
                    <option value="irregular">Irregular</option>
                  </select>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Adding...
                    </div>
                  ) : (
                    <>
                      <Plus className="h-5 w-5 inline mr-2" />
                      Add Transaction
                    </>
                  )}
                </button>
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
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                  
                  {/* Filter */}
                  <div className="relative">
                    <Filter className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none bg-white"
                    >
                      <option value="all">All Types</option>
                      <option value="credit">Credit Only</option>
                      <option value="debit">Debit Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4">
                      <FileText className="h-8 w-8 text-gray-400 mx-auto" />
                    </div>
                    <p className="text-gray-500 text-lg font-medium">No transactions found</p>
                    <p className="text-gray-400 text-sm mt-1">
                      {transactions.length === 0 
                        ? "Add your first transaction to get started!" 
                        : "Try adjusting your search or filter criteria."}
                    </p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Frequency</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {new Date(transaction.date).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4">
                            <div className="max-w-xs">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {transaction.description}
                              </p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              transaction.type === 'credit' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.type === 'credit' ? (
                                <TrendingUp className="h-3 w-3 mr-1" />
                              ) : (
                                <TrendingDown className="h-3 w-3 mr-1" />
                              )}
                              {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              transaction.frequency === 'regular' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {transaction.frequency.charAt(0).toUpperCase() + transaction.frequency.slice(1)}
                            </span>
                          </td>
                          <td className={`py-4 px-4 text-right font-semibold ${
                            transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'credit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="Delete transaction"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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