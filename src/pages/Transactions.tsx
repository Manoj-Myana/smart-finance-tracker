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
                    <DollarSign className="h-6 w-6 inline mr-3" />
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
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Search */}
                  <div className="relative flex items-center">
                    <Search 
                      className="h-6 w-6 absolute top-1/2 transform -translate-y-1/2 text-gray-400 z-10" 
                      style={{ left: '24px' }}
                    />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-6 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white shadow-sm min-w-[260px] flex items-center"
                      style={{ paddingLeft: '56px', backgroundImage: 'none' }}
                    />
                  </div>
                  
                  {/* Filter */}
                  <div className="relative flex items-center">
                    <Filter 
                      className="h-6 w-6 absolute top-1/2 transform -translate-y-1/2 text-gray-400 z-10" 
                      style={{ left: '24px' }}
                    />
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="pr-12 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none bg-white shadow-sm min-w-[200px] flex items-center"
                      style={{ paddingLeft: '56px', backgroundImage: 'none' }}
                    >
                      <option value="all">All Types</option>
                      <option value="credit">Credit Only</option>
                      <option value="debit">Debit Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="p-4 bg-gray-50 rounded-full w-20 h-20 mx-auto mb-6">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto" />
                    </div>
                    <p className="text-gray-600 text-xl font-medium mb-2">No transactions found</p>
                    <p className="text-gray-400 text-base">
                      {transactions.length === 0 
                        ? "Add your first transaction to get started!" 
                        : "Try adjusting your search or filter criteria."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left py-5 px-6 font-bold text-gray-800 text-lg uppercase tracking-wider">Date</th>
                          <th className="text-left py-5 px-6 font-bold text-gray-800 text-lg uppercase tracking-wider">Description</th>
                          <th className="text-left py-5 px-6 font-bold text-gray-800 text-lg uppercase tracking-wider">Type</th>
                          <th className="text-left py-5 px-6 font-bold text-gray-800 text-lg uppercase tracking-wider">Frequency</th>
                          <th className="text-right py-5 px-6 font-bold text-gray-800 text-lg uppercase tracking-wider">Amount</th>
                          <th className="text-center py-5 px-6 font-bold text-gray-800 text-lg uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredTransactions.map((transaction, index) => (
                          <tr key={transaction.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                            <td className="py-6 px-6 text-base text-gray-600 font-medium">
                              {new Date(transaction.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="py-6 px-6">
                              <div className="max-w-xs">
                                <p className="text-lg font-medium text-gray-900 truncate">
                                  {transaction.description}
                                </p>
                              </div>
                            </td>
                            <td className="py-6 px-6">
                              <span className={`inline-flex items-center px-4 py-2 rounded-full text-base font-medium ${
                                transaction.type === 'credit' 
                                  ? 'bg-green-100 text-green-700 border border-green-200' 
                                  : 'bg-red-100 text-red-700 border border-red-200'
                              }`}>
                                {transaction.type === 'credit' ? (
                                  <TrendingUp className="h-5 w-5 mr-2" />
                                ) : (
                                  <TrendingDown className="h-5 w-5 mr-2" />
                                )}
                                {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                              </span>
                            </td>
                            <td className="py-6 px-6">
                              <span className={`inline-flex items-center px-4 py-2 rounded-full text-base font-medium ${
                                transaction.frequency === 'regular' 
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                  : 'bg-amber-100 text-amber-700 border border-amber-200'
                              }`}>
                                {transaction.frequency.charAt(0).toUpperCase() + transaction.frequency.slice(1)}
                              </span>
                            </td>
                            <td className={`py-6 px-6 text-right font-bold text-lg ${
                              transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.type === 'credit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                            </td>
                            <td className="py-6 px-6 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => handleEditTransaction(transaction)}
                                  className="p-3 text-blue-500 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all duration-200 border border-transparent hover:border-blue-200"
                                  title="Edit transaction"
                                >
                                  <Edit className="h-6 w-6" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTransaction(transaction.id)}
                                  className="p-3 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all duration-200 border border-transparent hover:border-red-200"
                                  title="Delete transaction"
                                >
                                  <Trash2 className="h-6 w-6" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
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