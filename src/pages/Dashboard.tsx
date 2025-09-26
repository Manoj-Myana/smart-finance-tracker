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
  Bell
} from 'lucide-react';

interface UserType {
  id: number;
  fullName: string;
  email: string;
}

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
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
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

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
          <p className="text-gray-600 mt-4 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0, #cbd5e1) !important',
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        zIndex: 1
      }}
    >
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Welcome back, <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{user?.fullName?.split(' ')[0]}</span>! 👋
              </h1>
              <p className="text-gray-700 text-lg font-medium">
                Here's what's happening with your money today
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Balance Card */}
          <div 
            className="backdrop-blur-sm rounded-2xl shadow-lg border border-green-100/50 p-6 hover:shadow-xl transition-all"
            style={{
              backgroundColor: 'rgba(240, 253, 244, 0.9)',
              backgroundImage: 'none'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex items-center gap-1 text-green-600 bg-green-100 px-2 py-1 rounded-full">
                <ArrowUpRight className="h-3 w-3" />
                <span className="text-xs font-semibold">+12.5%</span>
              </div>
            </div>
            <p className="text-gray-700 text-sm font-medium mb-1">Total Balance</p>
            <p className="text-3xl font-bold text-gray-900">$24,500.00</p>
            <p className="text-xs text-gray-600 mt-1">All accounts combined</p>
          </div>

          {/* Monthly Income Card */}
          <div 
            className="backdrop-blur-sm rounded-2xl shadow-lg border border-blue-100/50 p-6 hover:shadow-xl transition-all"
            style={{
              backgroundColor: 'rgba(239, 246, 255, 0.9)',
              backgroundImage: 'none'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex items-center gap-1 text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                <ArrowUpRight className="h-3 w-3" />
                <span className="text-xs font-semibold">+8.2%</span>
              </div>
            </div>
            <p className="text-gray-700 text-sm font-medium mb-1">Monthly Income</p>
            <p className="text-3xl font-bold text-gray-900">$8,200.00</p>
            <p className="text-xs text-gray-600 mt-1">From 3 sources</p>
          </div>

          {/* Monthly Expenses Card */}
          <div 
            className="backdrop-blur-sm rounded-2xl shadow-lg border border-red-100/50 p-6 hover:shadow-xl transition-all"
            style={{
              backgroundColor: 'rgba(254, 242, 242, 0.9)',
              backgroundImage: 'none'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex items-center gap-1 text-red-600 bg-red-100 px-2 py-1 rounded-full">
                <ArrowDownRight className="h-3 w-3" />
                <span className="text-xs font-semibold">-3.1%</span>
              </div>
            </div>
            <p className="text-gray-700 text-sm font-medium mb-1">Monthly Expenses</p>
            <p className="text-3xl font-bold text-gray-900">$3,750.00</p>
            <p className="text-xs text-gray-600 mt-1">Across 12 categories</p>
          </div>

          {/* Savings Goal Card */}
          <div 
            className="backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100/50 p-6 hover:shadow-xl transition-all"
            style={{
              backgroundColor: 'rgba(250, 245, 255, 0.9)',
              backgroundImage: 'none'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex items-center gap-1 text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                <span className="text-xs font-semibold">73%</span>
              </div>
            </div>
            <p className="text-gray-700 text-sm font-medium mb-1">Savings Goal</p>
            <p className="text-3xl font-bold text-gray-900">$7,300</p>
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full w-3/4 transition-all"></div>
              </div>
              <p className="text-xs text-gray-600 mt-2">$2,700 to go</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            <div 
              className="backdrop-blur-sm rounded-2xl shadow-lg border border-orange-100/50 p-6"
              style={{
                backgroundColor: 'rgba(255, 247, 237, 0.8)',
                backgroundImage: 'none'
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline">View All</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button className="group flex flex-col items-center p-4 bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105 transform">
                  <div className="p-3 bg-white/10 rounded-lg mb-3 group-hover:bg-white/20 transition-all">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-semibold">Add Account</span>
                </button>
                
                <button 
                  className="group flex flex-col items-center p-4 text-white rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105 transform"
                  style={{
                    background: 'linear-gradient(to bottom right, #22c55e, #059669)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(to bottom right, #16a34a, #047857)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(to bottom right, #22c55e, #059669)';
                  }}
                >
                  <div className="p-3 bg-white/10 rounded-lg mb-3 group-hover:bg-white/20 transition-all">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-semibold">Add Income</span>
                </button>
                
                <button className="group flex flex-col items-center p-4 bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105 transform">
                  <div className="p-3 bg-white/10 rounded-lg mb-3 group-hover:bg-white/20 transition-all">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-semibold">Add Expense</span>
                </button>
                
                <button className="group flex flex-col items-center p-4 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl hover:scale-105 transform">
                  <div className="p-3 bg-white/10 rounded-lg mb-3 group-hover:bg-white/20 transition-all">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-semibold">Transfer</span>
                </button>
              </div>
            </div>

            {/* Recent Transactions */}
            <div 
              className="backdrop-blur-sm rounded-2xl shadow-lg border border-indigo-100/50 p-6"
              style={{
                backgroundColor: 'rgba(238, 242, 255, 0.8)',
                backgroundImage: 'none'
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Recent Transactions</h3>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline">View All</button>
              </div>
              <div className="space-y-4">
                {/* Sample Transaction Items */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <ArrowUpRight className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Salary Deposit</p>
                      <p className="text-sm text-gray-500">Today, 2:30 PM</p>
                    </div>
                  </div>
                  <p className="font-bold text-green-600">+$4,200.00</p>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Online Shopping</p>
                      <p className="text-sm text-gray-500">Yesterday, 6:45 PM</p>
                    </div>
                  </div>
                  <p className="font-bold text-red-600">-$145.99</p>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 rounded-xl">
                      <Activity className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Grocery Store</p>
                      <p className="text-sm text-gray-500">2 days ago, 10:15 AM</p>
                    </div>
                  </div>
                  <p className="font-bold text-red-600">-$87.32</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Overview */}
            <div 
              className="backdrop-blur-sm rounded-2xl shadow-lg border border-teal-100/50 p-6"
              style={{
                backgroundColor: 'rgba(240, 253, 250, 0.8)',
                backgroundImage: 'none'
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Accounts</h3>
                <Eye className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <Wallet className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Main Checking</p>
                      <p className="text-xs text-gray-500">**** 4532</p>
                    </div>
                  </div>
                  <p className="font-bold text-gray-900">$18,500</p>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-600 rounded-lg">
                      <Star className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Savings</p>
                      <p className="text-xs text-gray-500">**** 7891</p>
                    </div>
                  </div>
                  <p className="font-bold text-gray-900">$6,000</p>
                </div>
              </div>
            </div>

            {/* Monthly Goals */}
            <div 
              className="backdrop-blur-sm rounded-2xl shadow-lg border border-pink-100/50 p-6"
              style={{
                backgroundColor: 'rgba(253, 242, 248, 0.8)',
                backgroundImage: 'none'
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Monthly Goals</h3>
                <PieChart className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Savings</span>
                    <span className="text-sm font-bold text-gray-900">73%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full w-3/4 transition-all"></div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Budget</span>
                    <span className="text-sm font-bold text-gray-900">45%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full w-2/5 transition-all"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming */}
            <div 
              className="backdrop-blur-sm rounded-2xl shadow-lg border border-amber-100/50 p-6"
              style={{
                backgroundColor: 'rgba(255, 251, 235, 0.8)',
                backgroundImage: 'none'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Upcoming</h3>
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Rent Payment</p>
                    <p className="text-xs text-gray-500">Due in 3 days</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">$1,200</p>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Credit Card</p>
                    <p className="text-xs text-gray-500">Due in 8 days</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">$450</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Getting Started Section */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mt-16 -mr-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -mb-12 -ml-12"></div>
          <div className="relative z-10">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
                <Star className="h-4 w-4" />
                <span className="text-sm font-semibold">Welcome to Smart Finance Tracker</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Take control of your financial future
              </h2>
              <p className="text-indigo-100 mb-8 text-lg max-w-2xl mx-auto leading-relaxed">
                You've successfully created your account! Start your journey to financial freedom by tracking your 
                income, expenses, and setting achievable savings goals.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button className="px-8 py-4 bg-white/20 backdrop-blur-sm rounded-2xl hover:bg-white/30 transition-all transform hover:scale-105 border border-white/20 font-semibold">
                  📚 View Tutorial
                </button>
                <button className="px-8 py-4 bg-white text-indigo-600 rounded-2xl hover:bg-indigo-50 transition-all transform hover:scale-105 font-bold shadow-lg">
                  🚀 Get Started
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